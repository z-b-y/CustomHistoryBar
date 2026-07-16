import {
  colorForState,
  DEFAULT_CONFIG,
  normalizeConfig,
  normalizeState,
} from "./config";
import { escapeAttribute, escapeHtml } from "./dom";
import {
  buildSegments,
  fetchHistory,
  mergeCurrentState,
  segmentPosition,
} from "./history";
import { localize } from "./localize";
import { buildFourHourTicks, buildStateChangeTicks } from "./timeline";
import type {
  HassEntity,
  HistoryBarConfig,
  HomeAssistant,
  ResolvedHistoryBarConfig,
  TimelineSegment,
} from "./types";

const CARD_STYLE = `
  :host {
    display: block;
  }

  ha-card {
    display: block;
    padding: 16px;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .header.state-only {
    justify-content: flex-end;
  }

  .title {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .current-state {
    flex: 0 0 auto;
    color: var(--secondary-text-color);
    font-size: 14px;
  }

  .interactive {
    cursor: pointer;
  }

  .interactive:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 3px;
  }

  .bar {
    position: relative;
    height: 28px;
    overflow: hidden;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    background-size: 8px 8px;
  }

  .segment {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    min-width: 1px;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.4);
    box-sizing: border-box;
    color: #fff;
    font-size: 12px;
    line-height: 28px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
    white-space: nowrap;
  }

  .segment-label {
    display: block;
    padding: 0 6px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline {
    position: relative;
    height: 38px;
    margin-top: 4px;
  }

  .axis-tick {
    position: absolute;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .axis-tick.edge-left {
    transform: none;
  }

  .axis-tick.edge-right {
    transform: translateX(-100%);
  }

  .axis-tick::before {
    position: absolute;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: currentColor;
    content: "";
  }

  .major-tick {
    top: 19px;
    color: var(--secondary-text-color);
    font-size: 11px;
  }

  .major-tick::before {
    top: -5px;
    height: 4px;
    opacity: 0.65;
  }

  .change-tick {
    top: 0;
    color: var(--secondary-text-color);
    font-size: 9px;
    opacity: 0.55;
  }

  .change-tick::before {
    top: 11px;
    height: 5px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 12px;
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .swatch {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border: 1px solid rgba(127, 127, 127, 0.35);
    border-radius: 2px;
  }

  .status {
    margin-top: 10px;
    color: var(--secondary-text-color);
    font-size: 13px;
  }

  .status.error {
    color: var(--error-color, #db4437);
  }

  .status button {
    margin-left: 8px;
    border: 0;
    background: none;
    color: var(--primary-color);
    cursor: pointer;
    font: inherit;
    font-weight: 500;
  }

  .empty {
    padding: 8px 0 0;
    color: var(--secondary-text-color);
    font-size: 13px;
  }
`;

export class CustomHistoryBar extends HTMLElement {
  private _hass?: HomeAssistant;
  private _config?: ResolvedHistoryBarConfig;
  private _segments: TimelineSegment[] = [];
  private _windowStart = 0;
  private _windowEnd = 0;
  private _loading = false;
  private _error?: string;
  private _requestGeneration = 0;
  private _loadInFlight = false;
  private _reloadRequested = false;
  private _refreshTimer?: number;
  private _queuedLoad?: number;
  private _subscribedConnection?: HomeAssistant["connection"];
  private readonly _connectionReadyHandler = (): void =>
    this._queueHistoryLoad();

  public constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("custom-history-bar-editor");
  }

  public static getStubConfig(): HistoryBarConfig {
    return {
      entity: "",
      hours_to_show: DEFAULT_CONFIG.hours_to_show,
    };
  }

  public setConfig(config: HistoryBarConfig): void {
    const previousDataKey = this._config
      ? `${this._config.entity}:${this._config.hours_to_show}`
      : undefined;
    this._config = normalizeConfig(config);
    const nextDataKey = `${this._config.entity}:${this._config.hours_to_show}`;

    if (previousDataKey !== nextDataKey) {
      this._requestGeneration += 1;
      this._segments = [];
      this._error = undefined;
    }

    this._restartRefreshTimer();
    this.render();
    if (previousDataKey !== nextDataKey) {
      this._queueHistoryLoad();
    }
  }

  public set hass(hass: HomeAssistant) {
    const previousSignature = this._hassSignature(this._hass);
    const previousLastChanged = this._entity()?.last_changed;
    this._hass = hass;
    this._syncConnectionListener();
    const entity = this._config?.entity
      ? hass.states[this._config.entity]
      : undefined;
    const stateChanged =
      entity?.last_changed !== undefined &&
      entity.last_changed !== previousLastChanged;

    if (previousSignature !== this._hassSignature(hass)) {
      this.render();
    }
    if (stateChanged) {
      this._queueHistoryLoad();
    }
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public connectedCallback(): void {
    this._syncConnectionListener();
    this._restartRefreshTimer();
    this.render();
    this._queueHistoryLoad();
  }

  public disconnectedCallback(): void {
    this._detachConnectionListener();
    this._clearTimers();
    this._requestGeneration += 1;
    this._reloadRequested = false;
  }

  public getCardSize(): number {
    return this._config?.show_legend ? 3 : 2;
  }

  public getGridOptions(): Record<string, number> {
    return {
      rows: this._config?.show_legend ? 3 : 2,
      columns: 12,
      min_rows: 2,
      min_columns: 6,
    };
  }

  private _clearTimers(): void {
    if (this._refreshTimer !== undefined) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = undefined;
    }
    if (this._queuedLoad !== undefined) {
      window.clearTimeout(this._queuedLoad);
      this._queuedLoad = undefined;
    }
  }

  private _syncConnectionListener(): void {
    const connection = this.isConnected ? this._hass?.connection : undefined;
    if (connection === this._subscribedConnection) {
      return;
    }
    this._detachConnectionListener();
    if (connection) {
      connection.addEventListener("ready", this._connectionReadyHandler);
      this._subscribedConnection = connection;
    }
  }

  private _detachConnectionListener(): void {
    this._subscribedConnection?.removeEventListener(
      "ready",
      this._connectionReadyHandler,
    );
    this._subscribedConnection = undefined;
  }

  private _restartRefreshTimer(): void {
    if (this._refreshTimer !== undefined) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = undefined;
    }
    if (!this.isConnected || !this._config) {
      return;
    }
    this._refreshTimer = window.setInterval(
      () => this._queueHistoryLoad(),
      this._config.refresh_interval * 1000,
    );
  }

  private _queueHistoryLoad(): void {
    if (
      !this.isConnected ||
      !this._hass ||
      !this._config?.entity ||
      this._queuedLoad !== undefined
    ) {
      return;
    }
    if (this._loadInFlight) {
      this._reloadRequested = true;
      return;
    }
    this._queuedLoad = window.setTimeout(() => {
      this._queuedLoad = undefined;
      void this._loadHistory();
    }, 0);
  }

  private async _loadHistory(): Promise<void> {
    if (!this._hass || !this._config?.entity) {
      return;
    }
    if (this._loadInFlight) {
      this._reloadRequested = true;
      return;
    }

    this._loadInFlight = true;
    const requestGeneration = this._requestGeneration;
    const entityId = this._config.entity;
    const end = Date.now();
    const start = end - this._config.hours_to_show * 60 * 60 * 1000;
    this._loading = true;
    this._error = undefined;
    this.render();

    try {
      const states = await fetchHistory(
        this._hass,
        entityId,
        start,
        end,
      );
      if (
        requestGeneration !== this._requestGeneration ||
        entityId !== this._config?.entity
      ) {
        return;
      }
      this._windowStart = start;
      this._windowEnd = end;
      const currentEntity = this._hass.states[entityId];
      this._segments = buildSegments(
        mergeCurrentState(states, currentEntity),
        start,
        end,
      );
    } catch (error) {
      if (requestGeneration !== this._requestGeneration) {
        return;
      }
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loadInFlight = false;
      this._loading = false;
      if (requestGeneration === this._requestGeneration) {
        this.render();
      }
      const reloadRequested = this._reloadRequested;
      this._reloadRequested = false;
      if (reloadRequested && this.isConnected) {
        this._queueHistoryLoad();
      }
    }
  }

  private _entity(): HassEntity | undefined {
    return this._config?.entity
      ? this._hass?.states[this._config.entity]
      : undefined;
  }

  private _hassSignature(hass: HomeAssistant | undefined): string {
    const entity = this._config?.entity
      ? hass?.states[this._config.entity]
      : undefined;
    return JSON.stringify([
      entity?.state,
      entity?.last_changed,
      entity?.attributes.friendly_name,
      entity?.attributes.options,
      hass?.locale.language,
      hass?.config.time_zone,
    ]);
  }

  private _stateLabel(state: string): string {
    const normalizedState = normalizeState(state);
    const override = this._config?.state_labels[normalizedState];
    if (override) {
      return override;
    }

    const entity = this._entity();
    if (entity && this._hass?.formatEntityState) {
      try {
        return this._hass.formatEntityState({ ...entity, state });
      } catch {
        // Fall back to the raw state when a frontend formatter is unavailable.
      }
    }
    return state;
  }

  private _formatTime(timestamp: number, includeDate = false): string {
    try {
      return new Intl.DateTimeFormat(this._hass?.locale.language ?? "en", {
        day: includeDate ? "numeric" : undefined,
        month: includeDate ? "numeric" : undefined,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: this._hass?.config.time_zone,
      }).format(timestamp);
    } catch {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  private _formatDuration(duration: number): string {
    const totalMinutes = Math.max(1, Math.round(duration / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
      return `${minutes} ${localize(this._hass, "minutesShort")}`;
    }
    if (minutes === 0) {
      return `${hours} ${localize(this._hass, "hoursShort")}`;
    }
    return `${hours} ${localize(this._hass, "hoursShort")} ${minutes} ${localize(this._hass, "minutesShort")}`;
  }

  private _safeColor(value: string, fallback: string): string {
    return typeof CSS === "undefined" || CSS.supports("color", value)
      ? value
      : fallback;
  }

  private _segmentsMarkup(): string {
    if (!this._config || this._windowEnd <= this._windowStart) {
      return "";
    }
    return this._segments
      .map((segment) => {
        const position = segmentPosition(
          segment,
          this._windowStart,
          this._windowEnd,
        );
        const label = this._stateLabel(segment.state);
        const color = this._safeColor(
          colorForState(this._config!, segment.state),
          DEFAULT_CONFIG.fallback_color,
        );
        const title = `${label}: ${this._formatTime(segment.start, true)}–${this._formatTime(segment.end, true)} · ${localize(this._hass, "duration")}: ${this._formatDuration(segment.end - segment.start)}`;
        const visibleLabel =
          position.width >= 7
            ? `<span class="segment-label">${escapeHtml(label)}</span>`
            : "";
        return `<div class="segment" style="left:${position.left.toFixed(4)}%;width:${position.width.toFixed(4)}%;background:${escapeAttribute(color)}" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(title)}">${visibleLabel}</div>`;
      })
      .join("");
  }

  private _timelineMarkup(): string {
    if (!this._config?.show_timeline) {
      return "";
    }
    const start =
      this._windowStart ||
      Date.now() - this._config.hours_to_show * 60 * 60 * 1000;
    const end = this._windowEnd || Date.now();
    const timeZone = this._hass?.config.time_zone;
    const mainTicks = buildFourHourTicks(start, end, timeZone);
    const changeTicks = buildStateChangeTicks(
      this._segments,
      start,
      end,
      timeZone,
      mainTicks,
    );
    const alignmentClass = (position: number): string =>
      position < 3 ? " edge-left" : position > 97 ? " edge-right" : "";
    const mainMarkup = mainTicks
      .map(
        (tick) =>
          `<span class="axis-tick major-tick${alignmentClass(tick.position)}" style="left:${tick.position.toFixed(4)}%">${escapeHtml(tick.label)}</span>`,
      )
      .join("");
    const changeMarkup = changeTicks
      .map((tick) => {
        const stateLabel = tick.state ? this._stateLabel(tick.state) : "";
        const title = stateLabel ? `${tick.label} · ${stateLabel}` : tick.label;
        return `<span class="axis-tick change-tick${alignmentClass(tick.position)}" style="left:${tick.position.toFixed(4)}%" title="${escapeAttribute(title)}">${escapeHtml(tick.label)}</span>`;
      })
      .join("");
    return `<div class="timeline" aria-hidden="true">${changeMarkup}${mainMarkup}</div>`;
  }

  private _legendMarkup(): string {
    if (!this._config?.show_legend) {
      return "";
    }
    const options = this._entity()?.attributes.options ?? [];
    const states = [
      ...options,
      ...Object.keys(this._config.state_colors),
      ...this._segments.map((segment) => segment.state),
    ].map(normalizeState);
    const uniqueStates = [...new Set(states)];
    const items = uniqueStates
      .map((state) => {
        const color = this._safeColor(
          colorForState(this._config!, state),
          DEFAULT_CONFIG.fallback_color,
        );
        return `<span class="legend-item"><span class="swatch" style="background:${escapeAttribute(color)}"></span>${escapeHtml(this._stateLabel(state))}</span>`;
      })
      .join("");
    return items ? `<div class="legend">${items}</div>` : "";
  }

  private _statusMarkup(): string {
    if (this._error) {
      return `<div class="status error" title="${escapeAttribute(this._error)}">${escapeHtml(localize(this._hass, "loadError"))}<button id="retry" type="button">${escapeHtml(localize(this._hass, "retry"))}</button></div>`;
    }
    if (this._loading) {
      return `<div class="status">${escapeHtml(localize(this._hass, "loading"))}</div>`;
    }
    if (this._segments.length === 0) {
      return `<div class="empty">${escapeHtml(localize(this._hass, "noHistory"))} ${escapeHtml(localize(this._hass, "recorderHint"))}</div>`;
    }
    return "";
  }

  private _openMoreInfo(): void {
    if (!this._config?.entity) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId: this._config.entity },
      }),
    );
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }
    if (!this._config) {
      this.shadowRoot.innerHTML = `<style>${CARD_STYLE}</style><ha-card><div class="empty">${escapeHtml(localize(this._hass, "noEntity"))}</div></ha-card>`;
      return;
    }
    if (!this._config.entity) {
      this.shadowRoot.innerHTML = `<style>${CARD_STYLE}</style><ha-card><div class="empty">${escapeHtml(localize(this._hass, "noEntity"))}</div></ha-card>`;
      return;
    }

    const entity = this._entity();
    const title =
      this._config.name ||
      (typeof entity?.attributes.friendly_name === "string"
        ? entity.attributes.friendly_name
        : this._config.entity);
    const currentState =
      this._config.show_current_state && entity
        ? `<span class="current-state">${escapeHtml(this._stateLabel(entity.state))}</span>`
        : "";
    const visibleTitle = this._config.show_name
      ? `<span class="title">${escapeHtml(title)}</span>`
      : "";
    const header =
      visibleTitle || currentState
        ? `<div class="header interactive${visibleTitle ? "" : " state-only"}" id="more-info" role="button" tabindex="0">${visibleTitle}${currentState}</div>`
        : "";
    const noDataColor = this._safeColor(
      this._config.no_data_color,
      DEFAULT_CONFIG.no_data_color,
    );
    const barLabel = `${title}, ${this._config.hours_to_show} ${localize(this._hass, "hoursShort")}`;

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLE}</style>
      <ha-card>
        ${header}
        <div class="bar interactive" id="history-bar" role="img" tabindex="0" aria-label="${escapeAttribute(barLabel)}" style="background-color:${escapeAttribute(noDataColor)};background-image:repeating-linear-gradient(135deg, transparent 0, transparent 4px, rgba(127,127,127,.12) 4px, rgba(127,127,127,.12) 8px)">
          ${this._segmentsMarkup()}
        </div>
        ${this._timelineMarkup()}
        ${this._legendMarkup()}
        ${this._statusMarkup()}
      </ha-card>
    `;

    this.shadowRoot
      .querySelector<HTMLButtonElement>("#retry")
      ?.addEventListener("click", () => this._queueHistoryLoad());
    for (const element of this.shadowRoot.querySelectorAll<HTMLElement>(
      "#more-info, #history-bar",
    )) {
      element.addEventListener("click", () => this._openMoreInfo());
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._openMoreInfo();
        }
      });
    }
  }
}
