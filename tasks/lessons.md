# Poučení

- Při přidání volitelné části karty vždy současně aktualizovat vykreslení, `getCardSize()` i `getGridOptions()` a otestovat kombinaci zapnuto/vypnuto. Výšku neodvozovat jen od jedné volby, pokud výsledný obsah skládá více nezávislých bloků.
- Průběžné načítání nesmí přidávat do již vykreslené karty pomocný obsah, který mění její výšku. Stav načítání zobrazovat pouze před prvním úspěšným načtením, nebo jej zachovat bez změny rozložení.
- Nativní color picker má pro průběžné promítání používat událost `input`; při návratu stejné konfigurace z Home Assistantu se editor nesmí překreslit, jinak se aktivní picker zavře.
