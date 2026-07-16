import type {
  HistoryBarConfig,
  ResolvedHistoryBarConfig,
} from "./types";

export const DEFAULT_STATE_COLORS: Readonly<Record<string, string>> = {
  healthy: "#84a5d4",
  fine: "#41c49d",
  fair: "#f8e71e",
  poor: "#fdc46f",
  unhealthy: "#ff6669",
  unknown: "#9e9e9e",
  unavailable: "#616161",
};

export const DEFAULT_STATE_ORDER = [
  "healthy",
  "fine",
  "fair",
  "poor",
  "unhealthy",
  "unknown",
  "unavailable",
] as const;

export const DEFAULT_CONFIG = {
  hours_to_show: 24,
  refresh_interval: 60,
  fallback_color: "#607d8b",
  no_data_color: "rgba(127, 127, 127, 0.22)",
  show_legend: false,
  show_current_state: true,
  show_timeline: true,
} as const;

const isStringMap = (value: unknown): value is Record<string, string> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([key, item]) => key.trim().length > 0 && typeof item === "string" && item.trim().length > 0,
  );

export const normalizeState = (state: string): string =>
  state.trim().toLowerCase();

export function normalizeConfig(
  config: HistoryBarConfig,
): ResolvedHistoryBarConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid card configuration");
  }
  if (typeof config.entity !== "string") {
    throw new Error("Entity must be a string");
  }

  const hoursToShow = config.hours_to_show ?? DEFAULT_CONFIG.hours_to_show;
  if (
    !Number.isFinite(hoursToShow) ||
    hoursToShow < 0.25 ||
    hoursToShow > 720
  ) {
    throw new Error("hours_to_show must be between 0.25 and 720");
  }

  const refreshInterval =
    config.refresh_interval ?? DEFAULT_CONFIG.refresh_interval;
  if (
    !Number.isFinite(refreshInterval) ||
    refreshInterval < 15 ||
    refreshInterval > 3600
  ) {
    throw new Error("refresh_interval must be between 15 and 3600 seconds");
  }

  if (config.state_colors !== undefined && !isStringMap(config.state_colors)) {
    throw new Error("state_colors must contain non-empty string values");
  }
  if (config.state_labels !== undefined && !isStringMap(config.state_labels)) {
    throw new Error("state_labels must contain non-empty string values");
  }

  const stateColors = Object.fromEntries(
    Object.entries(config.state_colors ?? {}).map(([state, color]) => [
      normalizeState(state),
      color.trim(),
    ]),
  );
  const stateLabels = Object.fromEntries(
    Object.entries(config.state_labels ?? {}).map(([state, label]) => [
      normalizeState(state),
      label.trim(),
    ]),
  );

  return {
    ...config,
    entity: config.entity.trim(),
    hours_to_show: hoursToShow,
    refresh_interval: refreshInterval,
    state_colors: stateColors,
    state_labels: stateLabels,
    fallback_color:
      config.fallback_color?.trim() || DEFAULT_CONFIG.fallback_color,
    no_data_color:
      config.no_data_color?.trim() || DEFAULT_CONFIG.no_data_color,
    show_legend: config.show_legend ?? DEFAULT_CONFIG.show_legend,
    show_current_state:
      config.show_current_state ?? DEFAULT_CONFIG.show_current_state,
    show_timeline: config.show_timeline ?? DEFAULT_CONFIG.show_timeline,
  };
}

export const colorForState = (
  config: ResolvedHistoryBarConfig,
  state: string,
): string => {
  const normalizedState = normalizeState(state);
  return (
    config.state_colors[normalizedState] ??
    DEFAULT_STATE_COLORS[normalizedState] ??
    config.fallback_color
  );
};
