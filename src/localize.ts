import type { HomeAssistant } from "./types";

const translations = {
  en: {
    title: "History bar",
    entity: "Entity",
    name: "Name",
    hours: "Hours to show",
    refresh: "Refresh interval (seconds)",
    colors: "State colors",
    rawState: "raw state",
    reset: "Reset",
    fallback: "Fallback color",
    noDataColor: "No-data color",
    showName: "Show entity name",
    showLegend: "Show legend",
    showCurrentState: "Show current state",
    showTimeline: "Show timeline",
    selectEntity: "Select an enum entity",
    loading: "Loading history…",
    noHistory: "No recorded history is available for this period.",
    recorderHint: "Check whether the entity is included in Recorder.",
    retry: "Retry",
    loadError: "History could not be loaded.",
    noEntity: "Select an entity in the card editor.",
    duration: "Duration",
    hoursShort: "h",
    minutesShort: "min",
  },
  cs: {
    title: "Pruh historie",
    entity: "Entita",
    name: "Název",
    hours: "Hodin k zobrazení",
    refresh: "Interval obnovení (sekundy)",
    colors: "Barvy stavů",
    rawState: "surový stav",
    reset: "Obnovit",
    fallback: "Barva ostatních stavů",
    noDataColor: "Barva chybějících dat",
    showName: "Zobrazit název entity",
    showLegend: "Zobrazit legendu",
    showCurrentState: "Zobrazit aktuální stav",
    showTimeline: "Zobrazit časovou osu",
    selectEntity: "Vyberte enum entitu",
    loading: "Načítám historii…",
    noHistory: "Pro toto období není dostupná zaznamenaná historie.",
    recorderHint: "Zkontrolujte, zda je entita zahrnuta v Recorderu.",
    retry: "Zkusit znovu",
    loadError: "Historii se nepodařilo načíst.",
    noEntity: "Vyberte entitu v editoru karty.",
    duration: "Doba trvání",
    hoursShort: "h",
    minutesShort: "min",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export const languageFor = (hass?: HomeAssistant): "en" | "cs" =>
  hass?.locale?.language?.toLowerCase().startsWith("cs") ? "cs" : "en";

export const localize = (
  hass: HomeAssistant | undefined,
  key: TranslationKey,
): string => translations[languageFor(hass)][key];
