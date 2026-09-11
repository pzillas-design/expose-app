#!/usr/bin/env node
/**
 * Modellvergleich für Exposé — Bildbearbeitung, blind.
 *
 * Warum es dieses Skript gibt: Ranglisten messen allgemeine Bildbearbeitung.
 * Eure Aufgabe ist enger — Innenräume aufräumen, möblieren, aufhellen, dabei
 * Perspektive und Geometrie unangetastet lassen. Genau daran können Modelle
 * abweichen, deshalb wird an euren Bildern und euren echten Prompts gemessen.
 *
 * Ablauf:
 *   1. Bilder nach shootout/input/ legen (JPG/PNG).
 *   2. Schlüssel setzen (siehe MODELS unten), mindestens FAL_API_KEY.
 *      GEMINI_API_KEY kommt aus dem AI Studio (aistudio.google.com/apikey),
 *      nicht aus der Cloud Console — dafür braucht es kein GCP-Projekt.
 *   3. node scripts/model-shootout.mjs
 *   4. shootout/report.html öffnen — Blindvergleich, Modelle als A/B/C.
 *      Die Zuordnung steht in shootout/schluessel.json, erst danach ansehen.
 *
 * Erzeugt zusätzlich shootout/ergebnisse.json mit Zeit und Kosten je Lauf.
 *
 * ACHTUNG — Datenschutz: Der Testsatz geht an Anbieter, mit denen ihr keinen
 * Auftragsverarbeitungsvertrag habt. Nehmt eigene Fotos, keine Kundenobjekte.
 *
 * Die Adapter für OpenRouter sind nach Dokumentation gebaut, aber nicht gegen
 * die Live-API geprüft — die Sandbox, in der das Skript entstand, hat keinen
 * Netzzugang zu diesen Hosts. Beim ersten Lauf Antwortformat gegenprüfen.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'shootout');
const INPUT = path.join(ROOT, 'input');
const OUT = path.join(ROOT, 'out');

/* ── Die echten Aufgaben ────────────────────────────────────────────────────
   Wortlaut aus der Datenbank: die am häufigsten von Kunden abgeschickten
   Prompts, nicht nachgebaute. "perspektive erhalten" zieht sich durch fast
   alle — das ist die Achse, auf der sich die Modelle unterscheiden werden. */
const TASKS = [
    {
        id: 'aufraeumen',
        label: 'Aufräumen (häufigste Aufgabe, 57×)',
        prompt: 'Räume gründlich auf, aber lasse die Grundstruktur und Perspektive so wie sie ist.',
    },
    {
        id: 'homestaging',
        label: 'Home Staging',
        prompt: 'Füge ein professionelles Homestaging hinzu. Behalte Perspektive und Proportionen so wie sie sind bei.',
    },
    {
        id: 'aufhellen',
        label: 'Aufhellen',
        prompt: 'Helle den Raum auf, ändere nichts weiteres. Natürliche Farben, gut ausgeleuchtet, neutral weißes Licht.',
    },
    {
        id: 'entruempeln',
        label: 'Vollständig leeren',
        prompt: 'Remove all items from the room.',
    },
    {
        id: 'aussen',
        label: 'Außenbereich reinigen',
        prompt: 'Remove dirt and weeds from the floor, clean the floor, and add greenery to the flower pots.',
    },
];

/* ── Preise je Bild in USD ──────────────────────────────────────────────────
   1K-Listenpreise. Bei anderer Auflösung vor der Auswertung anpassen. */
const PRICE_1K = {
    'nb2-fal': 0.080,
    'nbpro-fal': 0.150,
    'mai-flash': 0.0195,
    'mai-26': 0.0389,
    'gemini-direkt': 0.067,
};

/* ── Modelle ──────────────────────────────────────────────────────────────── */
const MODELS = [
    {
        key: 'nb2-fal',
        name: 'Nano Banana 2 (fal)',
        note: 'Ist-Zustand — die Messlatte',
        env: 'FAL_API_KEY',
        run: (img, prompt, key) => fal('fal-ai/nano-banana-2/edit', img, prompt, key),
    },
    {
        key: 'nbpro-fal',
        name: 'Nano Banana Pro (fal)',
        note: 'Euer Premium-Tarif',
        env: 'FAL_API_KEY',
        run: (img, prompt, key) => fal('fal-ai/nano-banana-pro/edit', img, prompt, key),
    },
    {
        key: 'gemini-direkt',
        name: 'Nano Banana 2 (Google direkt)',
        note: 'Gleiches Modell wie über fal — misst den Aufpreis des Vermittlers',
        env: 'GEMINI_API_KEY',
        run: (img, prompt, key) => gemini('gemini-3.1-flash-image-preview', img, prompt, key),
    },
    {
        key: 'mai-flash',
        name: 'MAI-Image-2.6-Flash',
        note: 'Kandidat — laut Rangliste besser bei ¼ Preis',
        env: 'OPENROUTER_API_KEY',
        run: (img, prompt, key) => openrouter('microsoft/mai-image-2.6-flash', img, prompt, key),
    },
    {
        key: 'mai-26',
        name: 'MAI-Image-2.6',
        note: 'Die größere Variante',
        env: 'OPENROUTER_API_KEY',
        run: (img, prompt, key) => openrouter('microsoft/mai-image-2.6', img, prompt, key),
    },
];

/* ── Adapter: fal ───────────────────────────────────────────────────────────
   Gleiche Form wie generate-image-fal/index.ts, damit der Vergleich nicht an
   einer abweichenden Anfrage scheitert. */
async function fal(endpoint, dataUrl, prompt, apiKey) {
    const res = await fetch(`https://fal.run/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            image_urls: [dataUrl],
            resolution: '1K',
            num_images: 1,
        }),
    });
    if (!res.ok) throw new Error(`fal ${endpoint}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const url = data?.images?.[0]?.url;
    if (!url) throw new Error(`fal ${endpoint}: keine Bild-URL in ${JSON.stringify(data).slice(0, 200)}`);
    return url;
}

/* ── Adapter: OpenRouter ────────────────────────────────────────────────────
   Ein Schlüssel für MAI, Gemini und GPT — spart vier Konten für einen Test.
   Antwortformat beim ersten Lauf prüfen (siehe Kopfkommentar). */
async function openrouter(model, dataUrl, prompt, apiKey) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            modalities: ['image', 'text'],
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: dataUrl } },
                ],
            }],
        }),
    });
    if (!res.ok) throw new Error(`openrouter ${model}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();

    // OpenRouter reicht die Antwort des jeweiligen Anbieters durch, die Form
    // ist deshalb nicht über alle Modelle identisch. Lieber ein paar bekannte
    // Stellen abklopfen, als den Lauf an einer Formalie scheitern lassen.
    const msg = data?.choices?.[0]?.message;
    const img = msg?.images?.[0];
    const url =
        img?.image_url?.url ||
        img?.url ||
        (typeof img === 'string' ? img : null) ||
        data?.data?.[0]?.url ||
        (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

    if (!url) {
        // Rohantwort ablegen — daraus lässt sich der fehlende Pfad ergänzen,
        // ohne den ganzen Lauf zu wiederholen.
        const dump = path.join(ROOT, `antwort-${model.replace(/\W+/g, '-')}.json`);
        await writeFile(dump, JSON.stringify(data, null, 2)).catch(() => {});
        throw new Error(`openrouter ${model}: keine Bild-URL gefunden. Rohantwort: ${dump}`);
    }
    return url;
}

/* ── Adapter: Google direkt (Gemini Developer API) ──────────────────────────
   Bewusst NICHT Vertex AI: Der Developer-Zugang braucht nur einen Schlüssel
   aus dem AI Studio — kein GCP-Projekt, keine Dienstkonten, keine IAM-Rollen.
   Endpunktform gegen die Live-API geprüft (403 statt 404 ohne Schlüssel). */
async function gemini(model, dataUrl, prompt, apiKey) {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: 'POST',
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mime, data: b64 } },
                    ],
                }],
            }),
        },
    );
    if (!res.ok) throw new Error(`gemini ${model}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const part = parts.find((x) => x?.inline_data?.data || x?.inlineData?.data);
    const inline = part?.inline_data || part?.inlineData;
    if (!inline?.data) {
        const dump = path.join(ROOT, `antwort-${model}.json`);
        await writeFile(dump, JSON.stringify(data, null, 2)).catch(() => {});
        throw new Error(`gemini ${model}: kein Bild in der Antwort. Rohantwort: ${dump}`);
    }
    return `data:${inline.mime_type || inline.mimeType || 'image/png'};base64,${inline.data}`;
}

/* ── Hilfsfunktionen ───────────────────────────────────────────────────────── */
const mimeOf = (f) => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');

async function toDataUrl(file) {
    const buf = await readFile(file);
    return `data:${mimeOf(file)};base64,${buf.toString('base64')}`;
}

async function save(url, dest) {
    if (url.startsWith('data:')) {
        await writeFile(dest, Buffer.from(url.split(',')[1], 'base64'));
        return;
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Download fehlgeschlagen: HTTP ${r.status}`);
    await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* ── Hauptlauf ──────────────────────────────────────────────────────────────
   Bewusst seriell: Parallele Läufe verfälschen die Zeitmessung, und genau die
   ist eine der Fragen. */
async function main() {
    if (!existsSync(INPUT)) {
        await mkdir(INPUT, { recursive: true });
        console.log(`Ordner angelegt: ${INPUT}\nLege dort deine Testbilder ab und starte erneut.`);
        console.log('Wichtig: eigene Fotos verwenden, keine Kundenobjekte.');
        return;
    }

    const files = (await readdir(INPUT)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    if (!files.length) {
        console.log(`Keine Bilder in ${INPUT}. Erwartet werden JPG, PNG oder WebP.`);
        return;
    }

    const active = MODELS.filter((m) => {
        if (process.env[m.env]) return true;
        console.log(`Übersprungen: ${m.name} — ${m.env} nicht gesetzt.`);
        return false;
    });
    if (!active.length) {
        console.log('Kein Modell verfügbar. Mindestens FAL_API_KEY setzen.');
        return;
    }

    // Aufgaben reihum auf die Bilder verteilen, damit die Mischung dem
    // Kundenalltag entspricht statt fünfmal dieselbe Aufgabe zu messen.
    const runs = files.map((file, i) => ({ file, task: TASKS[i % TASKS.length] }));

    console.log(`\n${files.length} Bilder · ${active.length} Modelle · ${runs.length * active.length} Läufe\n`);

    const results = [];
    for (const m of active) {
        await mkdir(path.join(OUT, m.key), { recursive: true });
        const key = process.env[m.env];
        for (const { file, task } of runs) {
            const base = path.parse(file).name;
            const dest = path.join(OUT, m.key, `${base}__${task.id}.jpg`);
            process.stdout.write(`${m.name.padEnd(24)} ${base} · ${task.id} … `);
            const t0 = Date.now();
            try {
                const url = await m.run(await toDataUrl(path.join(INPUT, file)), task.prompt, key);
                await save(url, dest);
                const ms = Date.now() - t0;
                results.push({ modell: m.key, bild: file, aufgabe: task.id, ms, datei: dest, ok: true });
                console.log(`${(ms / 1000).toFixed(1)}s`);
            } catch (e) {
                const ms = Date.now() - t0;
                results.push({ modell: m.key, bild: file, aufgabe: task.id, ms, fehler: String(e.message), ok: false });
                console.log(`FEHLER — ${e.message}`);
            }
        }
    }

    /* Auswertung */
    const summary = active.map((m) => {
        const rs = results.filter((r) => r.modell === m.key);
        const ok = rs.filter((r) => r.ok);
        const price = PRICE_1K[m.key] ?? 0;
        return {
            modell: m.key,
            name: m.name,
            hinweis: m.note,
            laeufe: rs.length,
            erfolg: ok.length,
            median_s: ok.length ? +(median(ok.map((r) => r.ms)) / 1000).toFixed(1) : null,
            langsamster_s: ok.length ? +(Math.max(...ok.map((r) => r.ms)) / 1000).toFixed(1) : null,
            preis_je_bild_usd: price,
            kosten_lauf_usd: +(price * ok.length).toFixed(3),
            hochrechnung_6900_usd: +(price * 6900).toFixed(0),
        };
    });

    await writeFile(path.join(ROOT, 'ergebnisse.json'),
        JSON.stringify({ erstellt: new Date().toISOString(), zusammenfassung: summary, laeufe: results }, null, 2));

    // Blind: stabile, aber undurchsichtige Buchstaben je Modell.
    const letters = {};
    [...active].sort(() => Math.random() - 0.5).forEach((m, i) => { letters[m.key] = String.fromCharCode(65 + i); });
    await writeFile(path.join(ROOT, 'schluessel.json'),
        JSON.stringify({ hinweis: 'Erst nach dem Bewerten öffnen.', zuordnung: letters }, null, 2));

    await writeFile(path.join(ROOT, 'report.html'), buildReport(runs, active, letters, summary));

    console.log('\n── Zusammenfassung ──');
    for (const s of summary) {
        console.log(`${s.name.padEnd(24)} ${String(s.erfolg).padStart(2)}/${s.laeufe} ok · ` +
            `Median ${s.median_s ?? '—'}s · ${s.preis_je_bild_usd.toFixed(4)} $/Bild · ` +
            `${s.hochrechnung_6900_usd} $/Jahr bei 6.900 Bildern`);
    }
    console.log(`\nBlindvergleich: ${path.join(ROOT, 'report.html')}`);
    console.log(`Auflösung danach: ${path.join(ROOT, 'schluessel.json')}\n`);
}

/* ── Blindbericht ───────────────────────────────────────────────────────────
   Original neben den Ergebnissen, Modelle nur als Buchstabe. Die Zeiten stehen
   bewusst NICHT dabei — sie würden die Modelle verraten und das Urteil färben. */
function buildReport(runs, active, letters, summary) {
    const cols = [...active].sort((a, b) => letters[a.key].localeCompare(letters[b.key]));
    const rows = runs.map(({ file, task }) => {
        const base = path.parse(file).name;
        const cells = cols.map((m) => `
      <figure>
        <img src="out/${m.key}/${base}__${task.id}.jpg" alt="Ergebnis ${letters[m.key]}" loading="lazy">
        <figcaption>${letters[m.key]}</figcaption>
      </figure>`).join('');
        return `
    <section class="run">
      <h2>${base}</h2>
      <p class="task"><strong>${task.label}</strong><br><span>„${task.prompt}"</span></p>
      <div class="strip">
        <figure class="orig">
          <img src="input/${file}" alt="Original" loading="lazy">
          <figcaption>Original</figcaption>
        </figure>
        ${cells}
      </div>
    </section>`;
    }).join('');

    return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modellvergleich — blind</title>
<style>
  :root { color-scheme: light dark; --rule:#d9d7d2; --faint:#6f7679; }
  body { margin:0; padding:32px 20px 64px; background:#fbfaf8; color:#1a1d21;
         font:15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  @media (prefers-color-scheme: dark) {
    body { background:#121416; color:#eceae5; } :root { --rule:#2c3134; --faint:#8b9295; }
  }
  header { max-width:900px; margin:0 auto 36px; }
  h1 { font-size:24px; margin:0 0 8px; }
  header p { margin:0 0 6px; max-width:68ch; color:var(--faint); }
  .run { max-width:1400px; margin:0 auto 44px; border-top:1px solid var(--rule); padding-top:20px; }
  .run h2 { font-size:16px; margin:0 0 4px; }
  .task { margin:0 0 14px; font-size:13.5px; color:var(--faint); }
  .task span { font-style:italic; }
  .strip { display:flex; gap:14px; overflow-x:auto; padding-bottom:8px; }
  figure { margin:0; flex:0 0 300px; }
  figure img { width:100%; height:auto; display:block; border:1px solid var(--rule); background:#fff; }
  figcaption { font:600 12px/1.6 ui-monospace, Menlo, monospace; letter-spacing:.08em;
               text-transform:uppercase; color:var(--faint); padding-top:6px; }
  .orig figcaption { color:#1e4e5f; }
  @media (prefers-color-scheme: dark) { .orig figcaption { color:#7fc4d6; } }
</style></head><body>
<header>
  <h1>Modellvergleich — blind</h1>
  <p>Für jede Zeile: Welches Ergebnis würdest du einem Makler schicken? Achte vor allem darauf, ob Perspektive, Fenster und Raumgeometrie unangetastet geblieben sind — das ist der Punkt, an dem eure Kunden reklamieren.</p>
  <p>Notiere dein Urteil je Zeile, bevor du <code>schluessel.json</code> öffnest. Zeiten und Preise stehen in <code>ergebnisse.json</code>; sie sind hier bewusst ausgeblendet, weil sie die Modelle verraten würden.</p>
  <p>${summary.map((s) => s.erfolg + '/' + s.laeufe).join(' · ')} Läufe erfolgreich.</p>
</header>
${rows}
</body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
