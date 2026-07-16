# Plán práce

- [x] Ověřit aktuální rozhraní Home Assistantu pro načtení historie, registraci vlastní karty a vizuální editor.
- [x] Navrhnout veřejnou YAML konfiguraci včetně výchozích barev pro stavy `healthy`, `fine`, `fair`, `poor` a `unhealthy`.
- [x] Založit minimální TypeScript projekt kompatibilní s HACS jako Lovelace plugin.
- [x] Implementovat načtení historie entity a vykreslení barevného časového pruhu.
- [x] Implementovat vizuální editor pro entitu, časový rozsah, název a barvy jednotlivých stavů.
- [x] Doplnit ošetření chyb, prázdné historie, neznámých stavů a aktualizace dat.
- [x] Přidat automatické testy pro transformaci historie, lifecycle, editor a konfiguraci barev.
- [x] Připravit distribuční build a metadata HACS.
- [x] Napsat README s instalací přes HACS i ručně a s příklady konfigurace.
- [x] Spustit build, testy a závěrečnou kontrolu výsledného balíčku.

## Kontrola výsledku

- TypeScript kontrola proběhla bez chyb.
- Prošlo 23 automatických testů ve třech testovacích souborech.
- Produkční build vytvořil samostatný `dist/custom-history-bar.js` bez externích importů.
- Karta i editor byly vykresleny a vizuálně zkontrolovány v Chromium prohlížeči.
- HACS manifest, README a workflow pro validaci jsou přítomné.

## Rozšíření časové osy a názvu

- [x] Přidat konfigurační volbu `show_name` s výchozí hodnotou `true`.
- [x] Doplnit `show_name` do vizuálního editoru a lokalizací.
- [x] Vytvořit testovatelný výpočet hlavních časových značek po čtyřech hodinách v časové zóně Home Assistantu.
- [x] Zobrazit méně výrazné značky v okamžicích změn stavů.
- [x] Doplnit regresní testy konfigurace, komponenty a časové osy včetně přechodu letního času.
- [x] Aktualizovat README, demo a distribuční build.
- [x] Spustit kompletní validaci a vizuální kontrolu.

### Kontrola rozšíření

- `show_name` lze ovládat v YAML i vizuálním editoru; výchozí hodnota zachovává dosavadní zobrazení názvu.
- Hlavní časové značky respektují místní časovou zónu a přechody mezi letním a zimním časem.
- Vedlejší značky zobrazují pouze skutečné změny mezi navazujícími stavy a nekolidují s hlavními značkami.
- Prošlo 30 automatických testů ve čtyřech testovacích souborech, TypeScript kontrola i produkční build.
- Karta, obě řady časových značek a přepínač názvu byly vizuálně ověřeny v Chromium prohlížeči.

## Dynamická výška karty

- [x] Odvodit výšku z reálně zobrazeného záhlaví, časové osy a legendy.
- [x] Opravit `getCardSize()` pro masonry zobrazení.
- [x] Opravit `getGridOptions()` pro sections zobrazení.
- [x] Doplnit regresní testy všech podstatných kombinací viditelnosti.
- [x] Regenerovat distribuční build a provést vizuální kontrolu.

### Kontrola dynamické výšky

- Masonry velikost používá skutečnou výšku vykreslené karty; před připojením do DOM používá odhad ze zapnutých částí.
- Sections zobrazení nemá pevný počet řádků, takže respektuje přirozenou výšku i zalomenou legendu.
- Automatické testy pokrývají všech 16 kombinací názvu, aktuálního stavu, časové osy a legendy.
- V prohlížeči byla ověřena plná varianta s výškou 161 px a minimální varianta s výškou 62 px.
