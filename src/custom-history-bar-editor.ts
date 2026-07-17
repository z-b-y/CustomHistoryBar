import {
  DEFAULT_CONFIG,
  DEFAULT_STATE_COLORS,
  DEFAULT_STATE_ORDER,
  normalizeState,
} from "./config";
import { escapeAttribute, escapeHtml, isHexColor } from "./dom";
import { localize } from "./localize";
import type {
  HassEntity,
  HistoryBarConfig,
  HomeAssistant,
} from "./types";

const EDITOR_STYLE = `
  :host {
    display: block;
  }

  .editor {
    display: grid;
    gap: 16px;
    padding: 8px 0;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  label,
  .section-title {
    color: var(--primary-text-color);
    font-size: 14px;
    font-weight: 500;
  }

  input[type="text"],
  input[type="number"] {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    box-sizing: border-box;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font: inherit;
  }

  input:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .colors {
    display: grid;
    gap: 10px;
  }

  .color-row {
    display: grid;
    grid-template-columns: minmax(110px, 1fr) 42px minmax(120px, 1.2fr) auto;
    align-items: center;
    gap: 8px;
  }

  .state-name {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    text-overflow: ellipsis;
  }

  .raw-state {
    display: block;
    color: var(--secondary-text-color);
    font-family: monospace;
    font-size: 11px;
  }

  input[type="color"] {
    width: 42px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }

  .color-input {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 8px;
  }

  .reset {
    min-height: 36px;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: var(--primary-color);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
  }

  .toggles {
    display: grid;
    gap: 10px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--primary-text-color);
    font-size: 14px;
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .color-row {
      grid-template-columns: minmax(100px, 1fr) 42px minmax(100px, 1fr);
    }

    .reset {
      grid-column: 2 / 4;
      justify-self: end;
    }
  }
`;

export class CustomHistoryBarEditor extends HTMLElement {
  private _hass?: HomeAssistant;
  private _config: HistoryBarConfig = { entity: "" };
  private _optionsSignature = "";

  public constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  public set hass(hass: HomeAssistant) {
    const previousLanguage = this._hass?.locale.language;
    this._hass = hass;
    const signature = this._entityOptions().join("|");
    if (
      !this.shadowRoot?.hasChildNodes() ||
      signature !== this._optionsSignature ||
      previousLanguage !== hass.locale.language
    ) {
      this._optionsSignature = signature;
      this.render();
    }
  }

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public setConfig(config: HistoryBarConfig): void {
    const normalizedColors = Object.fromEntries(
      Object.entries(config.state_colors ?? {}).map(([state, color]) => [
        normalizeState(state),
        color,
      ]),
    );
    const normalizedLabels = Object.fromEntries(
      Object.entries(config.state_labels ?? {}).map(([state, label]) => [
        normalizeState(state),
        label,
      ]),
    );
    const nextConfig = {
      ...config,
      entity: config.entity ?? "",
      state_colors: normalizedColors,
      state_labels: normalizedLabels,
    };
    if (this._configSignature(nextConfig) === this._configSignature(this._config)) {
      return;
    }
    this._config = nextConfig;
    this._optionsSignature = this._entityOptions().join("|");
    this.render();
  }

  public connectedCallback(): void {
    this.render();
  }

  private _entity(): HassEntity | undefined {
    return this._config.entity
      ? this._hass?.states[this._config.entity]
      : undefined;
  }

  private _configSignature(config: HistoryBarConfig): string {
    const sortedMap = (map: Record<string, string> | undefined) =>
      Object.entries(map ?? {}).sort(([first], [second]) =>
        first.localeCompare(second),
      );
    const { state_colors, state_labels, ...rest } = config;
    return JSON.stringify({
      ...rest,
      state_colors: sortedMap(state_colors),
      state_labels: sortedMap(state_labels),
    });
  }

  private _entityOptions(): string[] {
    const options = this._entity()?.attributes.options;
    return Array.isArray(options)
      ? options.filter((option): option is string => typeof option === "string")
      : [];
  }

  private _editableStates(): string[] {
    const options = this._entityOptions().map(normalizeState);
    const configured = Object.keys(this._config.state_colors ?? {}).map(
      normalizeState,
    );
    const baseStates = options.length > 0 ? options : [...DEFAULT_STATE_ORDER];
    return [...new Set([...baseStates, ...configured, "unknown", "unavailable"])];
  }

  private _stateLabel(state: string): string {
    const override = this._config.state_labels?.[state];
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

  private _effectiveColor(state: string): string {
    return (
      this._config.state_colors?.[state] ??
      DEFAULT_STATE_COLORS[state] ??
      this._config.fallback_color ??
      DEFAULT_CONFIG.fallback_color
    );
  }

  private _entityListMarkup(): string {
    if (!this._hass) {
      return "";
    }
    return Object.values(this._hass.states)
      .filter(
        (entity) =>
          Array.isArray(entity.attributes.options) ||
          entity.entity_id === this._config.entity,
      )
      .sort((first, second) =>
        first.entity_id.localeCompare(second.entity_id),
      )
      .map((entity) => {
        const friendlyName =
          typeof entity.attributes.friendly_name === "string"
            ? entity.attributes.friendly_name
            : entity.entity_id;
        return `<option value="${escapeAttribute(entity.entity_id)}">${escapeHtml(friendlyName)}</option>`;
      })
      .join("");
  }

  private _colorsMarkup(): string {
    return this._editableStates()
      .map((state) => {
        const effectiveColor = this._effectiveColor(state);
        const pickerColor = isHexColor(effectiveColor)
          ? effectiveColor
          : DEFAULT_CONFIG.fallback_color;
        return `
          <div class="color-row">
            <span class="state-name">
              ${escapeHtml(this._stateLabel(state))}
              <span class="raw-state">${escapeHtml(state)}</span>
            </span>
            <input class="state-color-picker" type="color" data-state="${escapeAttribute(state)}" value="${escapeAttribute(pickerColor)}" aria-label="${escapeAttribute(this._stateLabel(state))}">
            <input class="state-color-text" type="text" data-state="${escapeAttribute(state)}" value="${escapeAttribute(effectiveColor)}" aria-label="${escapeAttribute(`${this._stateLabel(state)} color`)}">
            <button class="reset" type="button" data-reset-state="${escapeAttribute(state)}">${escapeHtml(localize(this._hass, "reset"))}</button>
          </div>
        `;
      })
      .join("");
  }

  private _emitConfig(config: HistoryBarConfig): void {
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config },
      }),
    );
  }

  private _updateField<K extends keyof HistoryBarConfig>(
    field: K,
    value: HistoryBarConfig[K],
  ): void {
    const config = { ...this._config, [field]: value };
    if (value === "" || value === undefined) {
      delete config[field];
      if (field === "entity") {
        config.entity = "";
      }
    }
    this._emitConfig(config);
  }

  private _updateStateColor(state: string, value?: string): void {
    const stateColors = { ...(this._config.state_colors ?? {}) };
    if (value?.trim()) {
      stateColors[state] = value.trim();
    } else {
      delete stateColors[state];
    }
    const config = { ...this._config };
    if (Object.keys(stateColors).length > 0) {
      config.state_colors = stateColors;
    } else {
      delete config.state_colors;
    }
    this._emitConfig(config);
  }

  private _bindEvents(): void {
    const root = this.shadowRoot;
    if (!root) {
      return;
    }

    root.querySelector<HTMLInputElement>("#entity")?.addEventListener(
      "change",
      (event) => {
        this._updateField("entity", (event.target as HTMLInputElement).value);
        this._optionsSignature = this._entityOptions().join("|");
        this.render();
      },
    );
    root.querySelector<HTMLInputElement>("#name")?.addEventListener(
      "change",
      (event) =>
        this._updateField("name", (event.target as HTMLInputElement).value),
    );

    for (const field of ["hours_to_show", "refresh_interval"] as const) {
      root
        .querySelector<HTMLInputElement>(`#${field}`)
        ?.addEventListener("change", (event) => {
          const input = event.target as HTMLInputElement;
          if (input.value.trim() === "") {
            this._updateField(field, undefined);
            this.render();
            return;
          }
          const value = Number(input.value);
          if (!Number.isFinite(value)) {
            this.render();
            return;
          }
          const minimum = field === "hours_to_show" ? 0.25 : 15;
          const maximum = field === "hours_to_show" ? 720 : 3600;
          const clamped = Math.min(maximum, Math.max(minimum, value));
          input.value = String(clamped);
          this._updateField(field, clamped);
        });
    }

    for (const field of [
      "fallback_color",
      "no_data_color",
    ] as const) {
      root
        .querySelector<HTMLInputElement>(`#${field}`)
        ?.addEventListener("change", (event) =>
          this._updateField(
            field,
            (event.target as HTMLInputElement).value,
          ),
        );
    }

    for (const field of [
      "show_name",
      "show_legend",
      "show_current_state",
      "show_timeline",
    ] as const) {
      root
        .querySelector<HTMLInputElement>(`#${field}`)
        ?.addEventListener("change", (event) =>
          this._updateField(field, (event.target as HTMLInputElement).checked),
        );
    }

    for (const input of root.querySelectorAll<HTMLInputElement>(
      ".state-color-picker",
    )) {
      input.addEventListener("input", () => {
        const state = input.dataset.state;
        if (state) {
          this._updateStateColor(state, input.value);
          const textInput = root.querySelector<HTMLInputElement>(
            `.state-color-text[data-state="${CSS.escape(state)}"]`,
          );
          if (textInput) {
            textInput.value = input.value;
          }
        }
      });
    }

    for (const input of root.querySelectorAll<HTMLInputElement>(
      ".config-color-picker",
    )) {
      input.addEventListener("input", () => {
        const field = input.dataset.colorField as
          | "fallback_color"
          | "no_data_color"
          | undefined;
        if (field) {
          this._updateField(field, input.value);
          const textInput = root.querySelector<HTMLInputElement>(`#${field}`);
          if (textInput) {
            textInput.value = input.value;
          }
        }
      });
    }

    for (const input of root.querySelectorAll<HTMLInputElement>(
      ".state-color-text",
    )) {
      input.addEventListener("input", () => {
        const state = input.dataset.state;
        if (state) {
          this._updateStateColor(state, input.value);
        }
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-reset-state]",
    )) {
      button.addEventListener("click", () => {
        const state = button.dataset.resetState;
        if (state) {
          this._updateStateColor(state);
          this.render();
        }
      });
    }
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const fallbackColor =
      this._config.fallback_color ?? DEFAULT_CONFIG.fallback_color;
    const noDataColor = this._config.no_data_color ?? DEFAULT_CONFIG.no_data_color;
    const pickerColor = (color: string): string =>
      isHexColor(color) ? color : DEFAULT_CONFIG.fallback_color;

    this.shadowRoot.innerHTML = `
      <style>${EDITOR_STYLE}</style>
      <div class="editor">
        <div class="field">
          <label for="entity">${escapeHtml(localize(this._hass, "entity"))}</label>
          <input id="entity" type="text" list="enum-entities" value="${escapeAttribute(this._config.entity ?? "")}" placeholder="sensor.netatmo_health_index">
          <datalist id="enum-entities">${this._entityListMarkup()}</datalist>
        </div>

        <div class="field">
          <label for="name">${escapeHtml(localize(this._hass, "name"))}</label>
          <input id="name" type="text" value="${escapeAttribute(this._config.name ?? "")}">
        </div>

        <div class="grid">
          <div class="field">
            <label for="hours_to_show">${escapeHtml(localize(this._hass, "hours"))}</label>
            <input id="hours_to_show" type="number" min="0.25" max="720" step="0.25" value="${escapeAttribute(this._config.hours_to_show ?? DEFAULT_CONFIG.hours_to_show)}">
          </div>
          <div class="field">
            <label for="refresh_interval">${escapeHtml(localize(this._hass, "refresh"))}</label>
            <input id="refresh_interval" type="number" min="15" max="3600" step="1" value="${escapeAttribute(this._config.refresh_interval ?? DEFAULT_CONFIG.refresh_interval)}">
          </div>
        </div>

        <div class="section-title">${escapeHtml(localize(this._hass, "colors"))}</div>
        <div class="colors">${this._colorsMarkup()}</div>

        <div class="grid">
          <div class="field">
            <label for="fallback_color">${escapeHtml(localize(this._hass, "fallback"))}</label>
            <div class="color-input">
              <input class="config-color-picker" type="color" data-color-field="fallback_color" value="${escapeAttribute(pickerColor(fallbackColor))}" aria-label="${escapeAttribute(`${localize(this._hass, "fallback")} picker`)}">
              <input id="fallback_color" type="text" value="${escapeAttribute(fallbackColor)}">
            </div>
          </div>
          <div class="field">
            <label for="no_data_color">${escapeHtml(localize(this._hass, "noDataColor"))}</label>
            <div class="color-input">
              <input class="config-color-picker" type="color" data-color-field="no_data_color" value="${escapeAttribute(pickerColor(noDataColor))}" aria-label="${escapeAttribute(`${localize(this._hass, "noDataColor")} picker`)}">
              <input id="no_data_color" type="text" value="${escapeAttribute(noDataColor)}">
            </div>
          </div>
        </div>

        <div class="toggles">
          <label class="toggle"><input id="show_name" type="checkbox" ${this._config.show_name ?? DEFAULT_CONFIG.show_name ? "checked" : ""}>${escapeHtml(localize(this._hass, "showName"))}</label>
          <label class="toggle"><input id="show_legend" type="checkbox" ${this._config.show_legend ?? DEFAULT_CONFIG.show_legend ? "checked" : ""}>${escapeHtml(localize(this._hass, "showLegend"))}</label>
          <label class="toggle"><input id="show_current_state" type="checkbox" ${this._config.show_current_state ?? DEFAULT_CONFIG.show_current_state ? "checked" : ""}>${escapeHtml(localize(this._hass, "showCurrentState"))}</label>
          <label class="toggle"><input id="show_timeline" type="checkbox" ${this._config.show_timeline ?? DEFAULT_CONFIG.show_timeline ? "checked" : ""}>${escapeHtml(localize(this._hass, "showTimeline"))}</label>
        </div>
      </div>
    `;

    this._bindEvents();
  }
}
