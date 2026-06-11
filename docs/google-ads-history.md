# Google Ads — Test-Historie & Vergleichs-Baseline

Damit Ads-Analysen über Umgebungen hinweg (lokal ↔ Cloud Compute) vergleichbar
bleiben. Die Live-Zahlen liegen im Google-Ads-Konto und sind via Pipeboard MCP
jederzeit abrufbar — dieses Doc hält die **Meilensteine + Snapshots** fest, damit
man weiß *was* sich *wann warum* geändert hat.

## Konto / Fixpunkte
- **Customer ID:** `9121611929`
- **Kampagne:** „expose ae googel ad" — ID `23694252879` (SEARCH)
- **Conversion-Tag:** `AW-627992730`
- **Conversion-Labels** (alphanumerisch, NICHT numerisch):
  - Registrierung → `ljknCP2w7ZwcEJrRuasC`
  - Bild generiert → `hSS0CICx7ZwcEJrRuasC`
  - Credits gekauft → `p1RRCIOx7ZwcEJrRuasC`
- **Anzeigengruppen:** Batch Bildbearbeitung (`199874142467`), KI Prompt Templates (`203597817344`)
- Pro Analyse: Skill `.claude/skills/google-ads-management/SKILL.md` nutzen.

## Snapshots (jeweils LAST_7_DAYS zum Datum)
| Datum | Impr. | Klicks | CTR | CPC | Kosten | Conversions | €/Conv |
|-------|-------|--------|-----|-----|--------|-------------|--------|
| 2026-06-05 | 483 | 34 | 7,0 % | €2,45 | €83 | 1 | €83 |
| 2026-06-06 | 596 | 81 | 13,6 % | €2,45 | €198 | 3 | €66 |
| 2026-06-07 | 596 | 81 | 13,6 % | €2,45 | €198 | 5 | €40 |
| 2026-06-09 | 806 | 92 | 11,4 % | €2,50 | €230 | 9 | €26 |

> Trend: Conversions 1 → 3 → 5 → 9; €/Conversion €83 → €26. CTR konstant stark
> (Branchenschnitt Search 2–5 %).

## Wesentliche Änderungen (Changelog)
- **Conversion-Tracking gefixt** — Labels waren als numerische IDs hinterlegt
  (`/7576705149`), wurden von Google still verworfen → auf alphanumerische Labels
  korrigiert. (Vorher: 0 getrackte Conversions seit Launch.)
- **Geo-Targeting** gesetzt: DACH (DE/AT/CH) + US/UK/AU/CA (vorher 95 % Junk-Traffic
  aus Niedriglohn-Ländern bei €0,01 CPC).
- **Keywords** erweitert: batch / bulk / parallel / gleichzeitig / zusammen +
  Templates (variablen, best practices) — je DE **und** EN, Phrase Match.
- **Anzeigen** (RSA) auf 15 Headlines / 4 Descriptions aufgefüllt (Batch + Templates,
  je DE/EN). Headlines max 30, Descriptions max 90 Zeichen.
- **CPC** der fokussierten Gruppen auf €2,50 (Default war €0,01 → kein Traffic).
- **Budget** verdoppelt.

## Offene Beobachtungen
- Batch-Gruppe zieht langsamer an als Templates (mehr Suchvolumen bei Prompt-Templates).
- Aktivierungsrate der App (~5–6 %) ist der eigentliche Wachstumshebel, nicht die
  Ad-Kosten — separates Thema (Welcome-Mail, Empty-State, Onboarding).

## Vergleichbarkeit auf Cloud Compute
1. Pipeboard-MCP dort verbinden (gleiche Google-Ads-Auth).
2. Gleiche Customer-ID `9121611929` verwenden.
3. Skill + dieses Doc reisen via Git mit → identische Methodik, volle Historie.
