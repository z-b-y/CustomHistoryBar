var k = Object.defineProperty;
var C = (i, o, t) => o in i ? k(i, o, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[o] = t;
var u = (i, o, t) => C(i, typeof o != "symbol" ? o + "" : o, t);
const $ = {
  healthy: "#84a5d4",
  fine: "#41c49d",
  fair: "#f8e71e",
  poor: "#fdc46f",
  unhealthy: "#ff6669",
  unknown: "#9e9e9e",
  unavailable: "#616161"
}, L = [
  "healthy",
  "fine",
  "fair",
  "poor",
  "unhealthy",
  "unknown",
  "unavailable"
], d = {
  hours_to_show: 24,
  refresh_interval: 60,
  fallback_color: "#607d8b",
  no_data_color: "rgba(127, 127, 127, 0.22)",
  show_legend: !1,
  show_current_state: !0,
  show_timeline: !0
}, w = (i) => i !== null && typeof i == "object" && !Array.isArray(i) && Object.entries(i).every(
  ([o, t]) => o.trim().length > 0 && typeof t == "string" && t.trim().length > 0
), f = (i) => i.trim().toLowerCase();
function E(i) {
  if (!i || typeof i != "object")
    throw new Error("Invalid card configuration");
  if (typeof i.entity != "string")
    throw new Error("Entity must be a string");
  const o = i.hours_to_show ?? d.hours_to_show;
  if (!Number.isFinite(o) || o < 0.25 || o > 720)
    throw new Error("hours_to_show must be between 0.25 and 720");
  const t = i.refresh_interval ?? d.refresh_interval;
  if (!Number.isFinite(t) || t < 15 || t > 3600)
    throw new Error("refresh_interval must be between 15 and 3600 seconds");
  if (i.state_colors !== void 0 && !w(i.state_colors))
    throw new Error("state_colors must contain non-empty string values");
  if (i.state_labels !== void 0 && !w(i.state_labels))
    throw new Error("state_labels must contain non-empty string values");
  const e = Object.fromEntries(
    Object.entries(i.state_colors ?? {}).map(([r, n]) => [
      f(r),
      n.trim()
    ])
  ), s = Object.fromEntries(
    Object.entries(i.state_labels ?? {}).map(([r, n]) => [
      f(r),
      n.trim()
    ])
  );
  return {
    ...i,
    entity: i.entity.trim(),
    hours_to_show: o,
    refresh_interval: t,
    state_colors: e,
    state_labels: s,
    fallback_color: i.fallback_color?.trim() || d.fallback_color,
    no_data_color: i.no_data_color?.trim() || d.no_data_color,
    show_legend: i.show_legend ?? d.show_legend,
    show_current_state: i.show_current_state ?? d.show_current_state,
    show_timeline: i.show_timeline ?? d.show_timeline
  };
}
const x = (i, o) => {
  const t = f(o);
  return i.state_colors[t] ?? $[t] ?? i.fallback_color;
}, a = (i) => String(i).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"), h = a, T = (i) => /^#[0-9a-f]{6}$/i.test(i);
async function q(i, o, t, e) {
  const s = await i.callWS({
    type: "history/history_during_period",
    start_time: new Date(t).toISOString(),
    end_time: new Date(e).toISOString(),
    entity_ids: [o],
    include_start_time_state: !0,
    minimal_response: !0,
    significant_changes_only: !0,
    no_attributes: !0
  });
  return Array.isArray(s?.[o]) ? s[o] : [];
}
function H(i) {
  const o = /* @__PURE__ */ new Map();
  for (const t of i) {
    const s = (t.lc ?? t.lu) * 1e3;
    typeof t.s != "string" || !Number.isFinite(s) || s < 0 || o.set(s, {
      state: f(t.s),
      timestamp: s
    });
  }
  return [...o.values()].sort(
    (t, e) => t.timestamp - e.timestamp
  );
}
function R(i, o) {
  if (i.length === 0 || !o)
    return i;
  const t = Date.parse(o.last_changed) / 1e3, e = Date.parse(o.last_updated) / 1e3;
  return Number.isFinite(t) ? [
    ...i,
    {
      s: o.state,
      a: {},
      lc: t,
      lu: Number.isFinite(e) ? Math.max(t, e) : t
    }
  ] : i;
}
function z(i, o, t) {
  if (!Number.isFinite(o) || !Number.isFinite(t) || t <= o)
    return [];
  const e = H(i).filter(
    (c) => c.timestamp < t
  ), s = [];
  let r;
  for (const c of e)
    c.timestamp <= o ? r = c : s.push(c);
  r && s.unshift({
    ...r,
    timestamp: o
  });
  const n = [];
  for (let c = 0; c < s.length; c += 1) {
    const _ = s[c];
    if (!_)
      continue;
    const p = s[c + 1], y = Math.max(_.timestamp, o), b = Math.min(p?.timestamp ?? t, t);
    if (b <= y)
      continue;
    const g = n[n.length - 1];
    g && g.state === _.state && g.end === y ? g.end = b : n.push({ state: _.state, start: y, end: b });
  }
  return n;
}
function M(i, o, t) {
  const e = t - o;
  return e <= 0 ? { left: 0, width: 0 } : {
    left: (i.start - o) / e * 100,
    width: (i.end - i.start) / e * 100
  };
}
const O = {
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
    minutesShort: "min"
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
    minutesShort: "min"
  }
}, F = (i) => i?.locale?.language?.toLowerCase().startsWith("cs") ? "cs" : "en", l = (i, o) => O[F(i)][o], v = `
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
    height: 24px;
    margin-top: 4px;
    color: var(--secondary-text-color);
    font-size: 11px;
  }

  .tick {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .tick:first-child {
    transform: none;
  }

  .tick:last-child {
    transform: translateX(-100%);
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
class j extends HTMLElement {
  constructor() {
    super();
    u(this, "_hass");
    u(this, "_config");
    u(this, "_segments", []);
    u(this, "_windowStart", 0);
    u(this, "_windowEnd", 0);
    u(this, "_loading", !1);
    u(this, "_error");
    u(this, "_requestGeneration", 0);
    u(this, "_loadInFlight", !1);
    u(this, "_reloadRequested", !1);
    u(this, "_refreshTimer");
    u(this, "_queuedLoad");
    u(this, "_subscribedConnection");
    u(this, "_connectionReadyHandler", () => this._queueHistoryLoad());
    this.attachShadow({ mode: "open" });
  }
  static getConfigElement() {
    return document.createElement("custom-history-bar-editor");
  }
  static getStubConfig() {
    return {
      entity: "",
      hours_to_show: d.hours_to_show
    };
  }
  setConfig(t) {
    const e = this._config ? `${this._config.entity}:${this._config.hours_to_show}` : void 0;
    this._config = E(t);
    const s = `${this._config.entity}:${this._config.hours_to_show}`;
    e !== s && (this._requestGeneration += 1, this._segments = [], this._error = void 0), this._restartRefreshTimer(), this.render(), e !== s && this._queueHistoryLoad();
  }
  set hass(t) {
    const e = this._hassSignature(this._hass), s = this._entity()?.last_changed;
    this._hass = t, this._syncConnectionListener();
    const r = this._config?.entity ? t.states[this._config.entity] : void 0, n = r?.last_changed !== void 0 && r.last_changed !== s;
    e !== this._hassSignature(t) && this.render(), n && this._queueHistoryLoad();
  }
  get hass() {
    return this._hass;
  }
  connectedCallback() {
    this._syncConnectionListener(), this._restartRefreshTimer(), this.render(), this._queueHistoryLoad();
  }
  disconnectedCallback() {
    this._detachConnectionListener(), this._clearTimers(), this._requestGeneration += 1, this._reloadRequested = !1;
  }
  getCardSize() {
    return this._config?.show_legend ? 3 : 2;
  }
  getGridOptions() {
    return {
      rows: this._config?.show_legend ? 3 : 2,
      columns: 12,
      min_rows: 2,
      min_columns: 6
    };
  }
  _clearTimers() {
    this._refreshTimer !== void 0 && (window.clearInterval(this._refreshTimer), this._refreshTimer = void 0), this._queuedLoad !== void 0 && (window.clearTimeout(this._queuedLoad), this._queuedLoad = void 0);
  }
  _syncConnectionListener() {
    const t = this.isConnected ? this._hass?.connection : void 0;
    t !== this._subscribedConnection && (this._detachConnectionListener(), t && (t.addEventListener("ready", this._connectionReadyHandler), this._subscribedConnection = t));
  }
  _detachConnectionListener() {
    this._subscribedConnection?.removeEventListener(
      "ready",
      this._connectionReadyHandler
    ), this._subscribedConnection = void 0;
  }
  _restartRefreshTimer() {
    this._refreshTimer !== void 0 && (window.clearInterval(this._refreshTimer), this._refreshTimer = void 0), !(!this.isConnected || !this._config) && (this._refreshTimer = window.setInterval(
      () => this._queueHistoryLoad(),
      this._config.refresh_interval * 1e3
    ));
  }
  _queueHistoryLoad() {
    if (!(!this.isConnected || !this._hass || !this._config?.entity || this._queuedLoad !== void 0)) {
      if (this._loadInFlight) {
        this._reloadRequested = !0;
        return;
      }
      this._queuedLoad = window.setTimeout(() => {
        this._queuedLoad = void 0, this._loadHistory();
      }, 0);
    }
  }
  async _loadHistory() {
    if (!this._hass || !this._config?.entity)
      return;
    if (this._loadInFlight) {
      this._reloadRequested = !0;
      return;
    }
    this._loadInFlight = !0;
    const t = this._requestGeneration, e = this._config.entity, s = Date.now(), r = s - this._config.hours_to_show * 60 * 60 * 1e3;
    this._loading = !0, this._error = void 0, this.render();
    try {
      const n = await q(
        this._hass,
        e,
        r,
        s
      );
      if (t !== this._requestGeneration || e !== this._config?.entity)
        return;
      this._windowStart = r, this._windowEnd = s;
      const c = this._hass.states[e];
      this._segments = z(
        R(n, c),
        r,
        s
      );
    } catch (n) {
      if (t !== this._requestGeneration)
        return;
      this._error = n instanceof Error ? n.message : String(n);
    } finally {
      this._loadInFlight = !1, this._loading = !1, t === this._requestGeneration && this.render();
      const n = this._reloadRequested;
      this._reloadRequested = !1, n && this.isConnected && this._queueHistoryLoad();
    }
  }
  _entity() {
    return this._config?.entity ? this._hass?.states[this._config.entity] : void 0;
  }
  _hassSignature(t) {
    const e = this._config?.entity ? t?.states[this._config.entity] : void 0;
    return JSON.stringify([
      e?.state,
      e?.last_changed,
      e?.attributes.friendly_name,
      e?.attributes.options,
      t?.locale.language,
      t?.config.time_zone
    ]);
  }
  _stateLabel(t) {
    const e = f(t), s = this._config?.state_labels[e];
    if (s)
      return s;
    const r = this._entity();
    if (r && this._hass?.formatEntityState)
      try {
        return this._hass.formatEntityState({ ...r, state: t });
      } catch {
      }
    return t;
  }
  _formatTime(t, e = !1) {
    try {
      return new Intl.DateTimeFormat(this._hass?.locale.language ?? "en", {
        day: e ? "numeric" : void 0,
        month: e ? "numeric" : void 0,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: this._hass?.config.time_zone
      }).format(t);
    } catch {
      return new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }
  _formatDuration(t) {
    const e = Math.max(1, Math.round(t / 6e4)), s = Math.floor(e / 60), r = e % 60;
    return s === 0 ? `${r} ${l(this._hass, "minutesShort")}` : r === 0 ? `${s} ${l(this._hass, "hoursShort")}` : `${s} ${l(this._hass, "hoursShort")} ${r} ${l(this._hass, "minutesShort")}`;
  }
  _safeColor(t, e) {
    return typeof CSS > "u" || CSS.supports("color", t) ? t : e;
  }
  _segmentsMarkup() {
    return !this._config || this._windowEnd <= this._windowStart ? "" : this._segments.map((t) => {
      const e = M(
        t,
        this._windowStart,
        this._windowEnd
      ), s = this._stateLabel(t.state), r = this._safeColor(
        x(this._config, t.state),
        d.fallback_color
      ), n = `${s}: ${this._formatTime(t.start, !0)}–${this._formatTime(t.end, !0)} · ${l(this._hass, "duration")}: ${this._formatDuration(t.end - t.start)}`, c = e.width >= 7 ? `<span class="segment-label">${a(s)}</span>` : "";
      return `<div class="segment" style="left:${e.left.toFixed(4)}%;width:${e.width.toFixed(4)}%;background:${h(r)}" title="${h(n)}" aria-label="${h(n)}">${c}</div>`;
    }).join("");
  }
  _timelineMarkup() {
    if (!this._config?.show_timeline)
      return "";
    const t = this._windowStart || Date.now() - this._config.hours_to_show * 60 * 60 * 1e3, e = this._windowEnd || Date.now(), s = this._config.hours_to_show > 24;
    return `<div class="timeline" aria-hidden="true">${Array.from({ length: 5 }, (n, c) => {
      const _ = c * 25, p = t + (e - t) * _ / 100;
      return `<span class="tick" style="left:${_}%">${a(this._formatTime(p, s))}</span>`;
    }).join("")}</div>`;
  }
  _legendMarkup() {
    if (!this._config?.show_legend)
      return "";
    const e = [
      ...this._entity()?.attributes.options ?? [],
      ...Object.keys(this._config.state_colors),
      ...this._segments.map((n) => n.state)
    ].map(f), r = [...new Set(e)].map((n) => {
      const c = this._safeColor(
        x(this._config, n),
        d.fallback_color
      );
      return `<span class="legend-item"><span class="swatch" style="background:${h(c)}"></span>${a(this._stateLabel(n))}</span>`;
    }).join("");
    return r ? `<div class="legend">${r}</div>` : "";
  }
  _statusMarkup() {
    return this._error ? `<div class="status error" title="${h(this._error)}">${a(l(this._hass, "loadError"))}<button id="retry" type="button">${a(l(this._hass, "retry"))}</button></div>` : this._loading ? `<div class="status">${a(l(this._hass, "loading"))}</div>` : this._segments.length === 0 ? `<div class="empty">${a(l(this._hass, "noHistory"))} ${a(l(this._hass, "recorderHint"))}</div>` : "";
  }
  _openMoreInfo() {
    this._config?.entity && this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: !0,
        composed: !0,
        detail: { entityId: this._config.entity }
      })
    );
  }
  render() {
    if (!this.shadowRoot)
      return;
    if (!this._config) {
      this.shadowRoot.innerHTML = `<style>${v}</style><ha-card><div class="empty">${a(l(this._hass, "noEntity"))}</div></ha-card>`;
      return;
    }
    if (!this._config.entity) {
      this.shadowRoot.innerHTML = `<style>${v}</style><ha-card><div class="empty">${a(l(this._hass, "noEntity"))}</div></ha-card>`;
      return;
    }
    const t = this._entity(), e = this._config.name || (typeof t?.attributes.friendly_name == "string" ? t.attributes.friendly_name : this._config.entity), s = this._config.show_current_state && t ? `<span class="current-state">${a(this._stateLabel(t.state))}</span>` : "", r = this._safeColor(
      this._config.no_data_color,
      d.no_data_color
    ), n = `${e}, ${this._config.hours_to_show} ${l(this._hass, "hoursShort")}`;
    this.shadowRoot.innerHTML = `
      <style>${v}</style>
      <ha-card>
        <div class="header interactive" id="more-info" role="button" tabindex="0">
          <span class="title">${a(e)}</span>
          ${s}
        </div>
        <div class="bar interactive" id="history-bar" role="img" tabindex="0" aria-label="${h(n)}" style="background-color:${h(r)};background-image:repeating-linear-gradient(135deg, transparent 0, transparent 4px, rgba(127,127,127,.12) 4px, rgba(127,127,127,.12) 8px)">
          ${this._segmentsMarkup()}
        </div>
        ${this._timelineMarkup()}
        ${this._legendMarkup()}
        ${this._statusMarkup()}
      </ha-card>
    `, this.shadowRoot.querySelector("#retry")?.addEventListener("click", () => this._queueHistoryLoad());
    for (const c of this.shadowRoot.querySelectorAll(
      "#more-info, #history-bar"
    ))
      c.addEventListener("click", () => this._openMoreInfo()), c.addEventListener("keydown", (_) => {
        (_.key === "Enter" || _.key === " ") && (_.preventDefault(), this._openMoreInfo());
      });
  }
}
const A = `
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
class D extends HTMLElement {
  constructor() {
    super();
    u(this, "_hass");
    u(this, "_config", { entity: "" });
    u(this, "_optionsSignature", "");
    this.attachShadow({ mode: "open" });
  }
  set hass(t) {
    const e = this._hass?.locale.language;
    this._hass = t;
    const s = this._entityOptions().join("|");
    (!this.shadowRoot?.hasChildNodes() || s !== this._optionsSignature || e !== t.locale.language) && (this._optionsSignature = s, this.render());
  }
  get hass() {
    return this._hass;
  }
  setConfig(t) {
    const e = Object.fromEntries(
      Object.entries(t.state_colors ?? {}).map(([r, n]) => [
        f(r),
        n
      ])
    ), s = Object.fromEntries(
      Object.entries(t.state_labels ?? {}).map(([r, n]) => [
        f(r),
        n
      ])
    );
    this._config = {
      ...t,
      entity: t.entity ?? "",
      state_colors: e,
      state_labels: s
    }, this._optionsSignature = this._entityOptions().join("|"), this.render();
  }
  connectedCallback() {
    this.render();
  }
  _entity() {
    return this._config.entity ? this._hass?.states[this._config.entity] : void 0;
  }
  _entityOptions() {
    const t = this._entity()?.attributes.options;
    return Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
  }
  _editableStates() {
    const t = this._entityOptions().map(f), e = Object.keys(this._config.state_colors ?? {}).map(
      f
    ), s = t.length > 0 ? t : [...L];
    return [.../* @__PURE__ */ new Set([...s, ...e, "unknown", "unavailable"])];
  }
  _stateLabel(t) {
    const e = this._config.state_labels?.[t];
    if (e)
      return e;
    const s = this._entity();
    if (s && this._hass?.formatEntityState)
      try {
        return this._hass.formatEntityState({ ...s, state: t });
      } catch {
      }
    return t;
  }
  _effectiveColor(t) {
    return this._config.state_colors?.[t] ?? $[t] ?? this._config.fallback_color ?? d.fallback_color;
  }
  _entityListMarkup() {
    return this._hass ? Object.values(this._hass.states).filter(
      (t) => Array.isArray(t.attributes.options) || t.entity_id === this._config.entity
    ).sort(
      (t, e) => t.entity_id.localeCompare(e.entity_id)
    ).map((t) => {
      const e = typeof t.attributes.friendly_name == "string" ? t.attributes.friendly_name : t.entity_id;
      return `<option value="${h(t.entity_id)}">${a(e)}</option>`;
    }).join("") : "";
  }
  _colorsMarkup() {
    return this._editableStates().map((t) => {
      const e = this._effectiveColor(t), s = T(e) ? e : d.fallback_color;
      return `
          <div class="color-row">
            <span class="state-name">
              ${a(this._stateLabel(t))}
              <span class="raw-state">${a(t)}</span>
            </span>
            <input class="state-color-picker" type="color" data-state="${h(t)}" value="${h(s)}" aria-label="${h(this._stateLabel(t))}">
            <input class="state-color-text" type="text" data-state="${h(t)}" value="${h(e)}" aria-label="${h(`${this._stateLabel(t)} color`)}">
            <button class="reset" type="button" data-reset-state="${h(t)}">${a(l(this._hass, "reset"))}</button>
          </div>
        `;
    }).join("");
  }
  _emitConfig(t) {
    this._config = t, this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: !0,
        composed: !0,
        detail: { config: t }
      })
    );
  }
  _updateField(t, e) {
    const s = { ...this._config, [t]: e };
    (e === "" || e === void 0) && (delete s[t], t === "entity" && (s.entity = "")), this._emitConfig(s);
  }
  _updateStateColor(t, e) {
    const s = { ...this._config.state_colors ?? {} };
    e?.trim() ? s[t] = e.trim() : delete s[t];
    const r = { ...this._config };
    Object.keys(s).length > 0 ? r.state_colors = s : delete r.state_colors, this._emitConfig(r);
  }
  _bindEvents() {
    const t = this.shadowRoot;
    if (t) {
      t.querySelector("#entity")?.addEventListener(
        "change",
        (e) => {
          this._updateField("entity", e.target.value), this._optionsSignature = this._entityOptions().join("|"), this.render();
        }
      ), t.querySelector("#name")?.addEventListener(
        "change",
        (e) => this._updateField("name", e.target.value)
      );
      for (const e of ["hours_to_show", "refresh_interval"])
        t.querySelector(`#${e}`)?.addEventListener("change", (s) => {
          const r = s.target;
          if (r.value.trim() === "") {
            this._updateField(e, void 0), this.render();
            return;
          }
          const n = Number(r.value);
          if (!Number.isFinite(n)) {
            this.render();
            return;
          }
          const p = Math.min(e === "hours_to_show" ? 720 : 3600, Math.max(e === "hours_to_show" ? 0.25 : 15, n));
          r.value = String(p), this._updateField(e, p);
        });
      for (const e of [
        "fallback_color",
        "no_data_color"
      ])
        t.querySelector(`#${e}`)?.addEventListener(
          "change",
          (s) => this._updateField(
            e,
            s.target.value
          )
        );
      for (const e of [
        "show_legend",
        "show_current_state",
        "show_timeline"
      ])
        t.querySelector(`#${e}`)?.addEventListener(
          "change",
          (s) => this._updateField(e, s.target.checked)
        );
      for (const e of t.querySelectorAll(
        ".state-color-picker"
      ))
        e.addEventListener("input", () => {
          const s = e.dataset.state;
          if (s) {
            this._updateStateColor(s, e.value);
            const r = t.querySelector(
              `.state-color-text[data-state="${CSS.escape(s)}"]`
            );
            r && (r.value = e.value);
          }
        });
      for (const e of t.querySelectorAll(
        ".state-color-text"
      ))
        e.addEventListener("input", () => {
          const s = e.dataset.state;
          s && this._updateStateColor(s, e.value);
        });
      for (const e of t.querySelectorAll(
        "[data-reset-state]"
      ))
        e.addEventListener("click", () => {
          const s = e.dataset.resetState;
          s && (this._updateStateColor(s), this.render());
        });
    }
  }
  render() {
    this.shadowRoot && (this.shadowRoot.innerHTML = `
      <style>${A}</style>
      <div class="editor">
        <div class="field">
          <label for="entity">${a(l(this._hass, "entity"))}</label>
          <input id="entity" type="text" list="enum-entities" value="${h(this._config.entity ?? "")}" placeholder="sensor.netatmo_health_index">
          <datalist id="enum-entities">${this._entityListMarkup()}</datalist>
        </div>

        <div class="field">
          <label for="name">${a(l(this._hass, "name"))}</label>
          <input id="name" type="text" value="${h(this._config.name ?? "")}">
        </div>

        <div class="grid">
          <div class="field">
            <label for="hours_to_show">${a(l(this._hass, "hours"))}</label>
            <input id="hours_to_show" type="number" min="0.25" max="720" step="0.25" value="${h(this._config.hours_to_show ?? d.hours_to_show)}">
          </div>
          <div class="field">
            <label for="refresh_interval">${a(l(this._hass, "refresh"))}</label>
            <input id="refresh_interval" type="number" min="15" max="3600" step="1" value="${h(this._config.refresh_interval ?? d.refresh_interval)}">
          </div>
        </div>

        <div class="section-title">${a(l(this._hass, "colors"))}</div>
        <div class="colors">${this._colorsMarkup()}</div>

        <div class="grid">
          <div class="field">
            <label for="fallback_color">${a(l(this._hass, "fallback"))}</label>
            <input id="fallback_color" type="text" value="${h(this._config.fallback_color ?? d.fallback_color)}">
          </div>
          <div class="field">
            <label for="no_data_color">${a(l(this._hass, "noDataColor"))}</label>
            <input id="no_data_color" type="text" value="${h(this._config.no_data_color ?? d.no_data_color)}">
          </div>
        </div>

        <div class="toggles">
          <label class="toggle"><input id="show_legend" type="checkbox" ${this._config.show_legend ?? d.show_legend ? "checked" : ""}>${a(l(this._hass, "showLegend"))}</label>
          <label class="toggle"><input id="show_current_state" type="checkbox" ${this._config.show_current_state ?? d.show_current_state ? "checked" : ""}>${a(l(this._hass, "showCurrentState"))}</label>
          <label class="toggle"><input id="show_timeline" type="checkbox" ${this._config.show_timeline ?? d.show_timeline ? "checked" : ""}>${a(l(this._hass, "showTimeline"))}</label>
        </div>
      </div>
    `, this._bindEvents());
  }
}
const m = "custom-history-bar", S = "custom-history-bar-editor";
customElements.get(S) || customElements.define(S, D);
customElements.get(m) || customElements.define(m, j);
window.customCards = window.customCards ?? [];
window.customCards.some((i) => i.type === m) || window.customCards.push({
  type: m,
  name: "Custom History Bar",
  description: "A configurable colored history bar for enum entities",
  preview: !0,
  getEntitySuggestion: (i, o) => {
    const t = i.states[o];
    return t && Array.isArray(t.attributes.options) ? {
      config: {
        type: `custom:${m}`,
        entity: o
      }
    } : null;
  }
});
console.info(
  "%c CUSTOM-HISTORY-BAR %c 0.1.0 ",
  "color: white; background: #84a5d4; font-weight: 700;",
  "color: #84a5d4; background: white; font-weight: 700;"
);
