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
