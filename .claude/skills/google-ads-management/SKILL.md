---
name: google-ads-management
description: >
  Verwaltet Google Ads Kampagnen über das Pipeboard MCP. Verwende diesen Skill
  immer wenn der Nutzer Google Ads erwähnt — Kampagnen prüfen, Keywords, CPC,
  Anzeigengruppen, Conversion-Tracking, Geo-Targeting, Budget, RSA-Anzeigen,
  "Ads checken", "warum kommen keine Klicks", "neue Anzeigengruppe", "keywords
  pausieren", "conversions prüfen". Auch bei nur "Google Ads" ohne weiteren Kontext.
---

# Google Ads Management via Pipeboard MCP

## Setup

**Customer ID** aus dem jeweiligen Google Ads Account — Format: `XXXXXXXXX` (ohne Bindestriche).
Vor dem ersten Call immer mit `list_google_ads_customers` bestätigen.

---

## Tool-Referenz

### Übersicht & Metriken

```
list_google_ads_customers          → verfügbare Accounts + Customer IDs
get_google_ads_campaigns           → alle Kampagnen + Status
get_google_ads_campaign_metrics    → Impressionen, Klicks, CTR, CPC, Kosten
get_google_ads_ad_groups           → Anzeigengruppen einer Kampagne
get_google_ads_keyword_metrics     → Performance pro Keyword
get_google_ads_ads                 → bestehende Anzeigen
get_google_ads_keywords            → Keywords einer Anzeigengruppe
```

### Freie GAQL-Abfragen
Für alles was die Standard-Tools nicht abdecken:
```
execute_google_ads_gaql_query(customer_id, query)
```
GAQL ist SQL-ähnlich, Tabellen: `campaign`, `ad_group`, `keyword_view`, `ad_group_ad`, u.a.

### Kampagne verwalten
```
create_google_ads_campaign(...)
update_google_ads_campaign(campaign_id, ...)   # Budget, Name, Status
pause_google_ads_campaign(campaign_id)
enable_google_ads_campaign(campaign_id)
```

### Anzeigengruppe verwalten
```
create_google_ads_ad_group(campaign_id, name, cpc_bid_micros)
update_google_ads_ad_group(ad_group_id, ...)
pause_google_ads_ad_group(ad_group_id)         # (via update_google_ads_ad_group mit status)
```

### RSA-Anzeige erstellen
```
create_google_ads_responsive_search_ad(
  ad_group_id,
  headlines,     # Liste von Strings, max 30 Zeichen pro Headline
  descriptions,  # Liste von Strings, max 90 Zeichen pro Description
  final_url
)
```

### Keywords
```
add_google_ads_keywords(ad_group_id, keywords)
# keywords = [{ text: "...", match_type: "PHRASE" | "EXACT" | "BROAD" }]

pause_google_ads_keyword(keyword_id)
enable_google_ads_keyword(keyword_id)
remove_google_ads_keywords(keyword_ids)
update_google_ads_keyword_bid(keyword_id, cpc_bid_micros)
```

**Phrase vs. Exact:**
- `PHRASE` — trifft auch Variationen und erweiterte Anfragen → mehr Reichweite
- `EXACT` — nur exakt dieser Begriff → kein Streuverlust, weniger Traffic

### Targeting
```
set_google_ads_geo_targeting(campaign_id, geo_target_constant_ids)
# IDs: DE=2276, AT=2040, CH=2756, US=2840, UK=2826, AU=2036, CA=2124

set_google_ads_language_targeting(campaign_id, language_codes)
# z.B. ["de", "en"]
```

### Negative Keywords
```
add_google_ads_negative_keywords(campaign_id_or_ad_group_id, keywords)
remove_google_ads_negative_keywords(...)
get_google_ads_negative_keywords(...)
```

### Extensions / Assets
```
create_google_ads_sitelink(...)
create_google_ads_callout(...)
create_google_ads_structured_snippet(...)
list_google_ads_assets(customer_id)
```

---

## Wichtige Stolperfallen

**CPC immer explizit setzen**
`cpc_bid_micros` nicht vergessen — Standard ist `10000` (= €0,01), damit bekommt
eine neue Gruppe faktisch keinen Traffic. Sinnvoller Einstieg: `2500000` (= €2,50).
Umrechnung: Betrag in € × 1.000.000

**Conversion-Label Format**
`send_to` muss das alphanumerische Label aus der Google Ads Konsole enthalten:
- ✅ `AW-XXXXXXXXX/alphanumLabel`
- ❌ `AW-XXXXXXXXX/7576705149` ← numerische IDs werden von Google silently ignoriert

**IDs aus entfernten Gruppen**
Keywords/Gruppen die bereits gelöscht wurden können nicht mehr pausiert werden
→ API-Fehler ignorieren, sie sind bereits inaktiv.

**Conversion-Verzögerung**
Neue Conversions erscheinen erst ~24h später in der Ads-Konsole.
