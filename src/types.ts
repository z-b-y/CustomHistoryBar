export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    options?: string[];
  };
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: {
    time_zone?: string;
  };
  locale: {
    language: string;
  };
  connection?: {
    addEventListener(type: "ready", listener: () => void): void;
    removeEventListener(type: "ready", listener: () => void): void;
  };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  formatEntityState?(state: HassEntity): string;
}

export interface HistoryBarConfig {
  type?: string;
  entity: string;
  name?: string;
  hours_to_show?: number;
  refresh_interval?: number;
  state_colors?: Record<string, string>;
  state_labels?: Record<string, string>;
  fallback_color?: string;
  no_data_color?: string;
  show_name?: boolean;
  show_legend?: boolean;
  show_current_state?: boolean;
  show_timeline?: boolean;
}

export interface ResolvedHistoryBarConfig extends HistoryBarConfig {
  hours_to_show: number;
  refresh_interval: number;
  state_colors: Record<string, string>;
  state_labels: Record<string, string>;
  fallback_color: string;
  no_data_color: string;
  show_name: boolean;
  show_legend: boolean;
  show_current_state: boolean;
  show_timeline: boolean;
}

export interface CompressedHistoryState {
  s: string;
  a?: Record<string, unknown>;
  lc?: number;
  lu: number;
}

export type HistoryResponse = Record<string, CompressedHistoryState[]>;

export interface TimelinePoint {
  state: string;
  timestamp: number;
}

export interface TimelineSegment {
  state: string;
  start: number;
  end: number;
}

export interface TimelineTick {
  timestamp: number;
  position: number;
  label: string;
  state?: string;
}

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description?: string;
      preview?: boolean;
      documentationURL?: string;
      getEntitySuggestion?: (
        hass: HomeAssistant,
        entityId: string,
      ) => { config: Record<string, unknown> } | null;
    }>;
  }
}
