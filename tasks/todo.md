# Plán práce

## Ruční spouštění GitHub Actions

- [x] Zachovat původní automatické spouštěče workflow jako komentované.
- [x] Povolit ruční spuštění `workflow_dispatch` pro validaci HACS i build.
- [x] Ověřit syntaxi obou workflow.

### Kontrola ručního spouštění

- Oba workflow mají jako jediný aktivní spouštěč `workflow_dispatch`; GitHub je nespustí při pushi, pull requestu ani podle plánu.

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

## Stabilita vykreslení a časové osy

- [x] Odstranit bílý oddělovač mezi sousedními segmenty.
- [x] U půlnoční značky časové osy zobrazovat datum ve formátu `den. měsíc.`.
- [x] Zabránit změně výšky při obnovení historie, pokud už karta obsahuje data.
- [x] Doplnit regresní testy vykreslení a obnovování.
- [x] Provést build a vizuální kontrolu.

### Kontrola stability vykreslení

- Sousední segmenty nemají oddělovací rámeček a navazují přímo.
- Hlavní značka v místní půlnoci používá datum, například `16. 7.`.
- Při obnovení už vykreslených dat se nezobrazuje dodatečný stav načítání, takže se nemění výška karty.
- Prošlo 50 automatických testů, TypeScript kontrola i produkční build.

## Potvrzovaný výběr barev a značky časové osy

- [x] Odesílat změnu z nativního pickeru až po jeho potvrzení nebo zavření.
- [x] Doplnit picker k barvě ostatních stavů a chybějících dat.
- [x] Oddělit přesnou pozici časové čáry od zarovnání jejího popisku.
- [x] Doplnit regresní testy editoru a časové osy.
- [x] Provést build a vizuální kontrolu.

### Kontrola pickeru a značek

- Nativní pickery odesílají konfiguraci až po události `change`; průběžný výběr barvy nemění kartu.
- Pickery jsou dostupné pro všechny stavové barvy, barvu ostatních stavů i barvu chybějících dat.
- Časová čára je ukotvená přesně na hodnotě času; posouvá se pouze krajní textový popisek.
- Prošlo 52 automatických testů, TypeScript kontrola, produkční build a vizuální kontrola v Chromium.

## Plynulý nativní color picker

- [x] Vrátit průběžné promítání barvy při události `input`.
- [x] Nevykreslovat editor při návratu nezměněné konfigurace z Home Assistantu.
- [x] Doplnit regresní test zachování aktivního pickeru.
- [x] Spustit kompletní validaci a regenerovat build.

### Kontrola plynulého pickeru

- Picker promítá barvu průběžně a vrácení stejné konfigurace neodpojí jeho DOM prvek.
- Prošlo 52 automatických testů, TypeScript kontrola i produkční build.
