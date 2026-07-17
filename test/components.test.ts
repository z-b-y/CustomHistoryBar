// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/index";
import { estimateCardHeight, masonrySizeForHeight } from "../src/card-size";
import { normalizeConfig } from "../src/config";
import type { HassEntity, HomeAssistant } from "../src/types";

const entityId = "sensor.health";

const createEntity = (): HassEntity => ({
  entity_id: entityId,
  state: "healthy",
  last_changed: "2026-07-16T10:00:00.000Z",
  last_updated: "2026-07-16T10:00:00.000Z",
  attributes: {
    friendly_name: "Health index",
    options: ["healthy", "fine", "fair", "poor", "unhealthy"],
  },
});

const createHass = (
  callWS: HomeAssistant["callWS"] = vi.fn().mockResolvedValue({}),
): HomeAssistant => ({
  states: { [entityId]: createEntity() },
  config: { time_zone: "Europe/Prague" },
  locale: { language: "en" },
  callWS,
  formatEntityState: (entity) => entity.state,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("CustomHistoryBar", () => {
  it.each([
    [false, false, false, false, 2],
    [false, false, false, true, 2],
    [false, false, true, false, 3],
    [false, false, true, true, 3],
    [true, false, false, false, 2],
    [false, true, false, false, 2],
    [true, true, false, false, 2],
    [true, false, false, true, 3],
    [false, true, false, true, 3],
    [true, true, false, true, 3],
    [true, false, true, false, 3],
    [false, true, true, false, 3],
    [true, true, true, false, 3],
    [true, false, true, true, 4],
    [false, true, true, true, 4],
    [true, true, true, true, 4],
  ])(
    "computes masonry size for name=%s, state=%s, timeline=%s, legend=%s",
    (showName, showCurrentState, showTimeline, showLegend, expectedSize) => {
      const config = normalizeConfig({
        entity: entityId,
        show_name: showName,
        show_current_state: showCurrentState,
        show_timeline: showTimeline,
        show_legend: showLegend,
      });

      expect(masonrySizeForHeight(estimateCardHeight(config))).toBe(
        expectedSize,
      );
    },
  );

  it("uses natural height in sections view to allow wrapped content", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      getGridOptions(): Record<string, number>;
    };

    expect(card.getGridOptions()).toEqual({ columns: 12, min_columns: 6 });
  });

  it("prefers the rendered height when it is available", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      getCardSize(): number;
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({
      entity: entityId,
      show_name: false,
      show_current_state: false,
      show_timeline: false,
      show_legend: false,
    });
    const renderedCard = card.shadowRoot?.querySelector<HTMLElement>("ha-card");
    Object.defineProperty(renderedCard, "scrollHeight", {
      configurable: true,
      value: 151,
    });

    expect(card.getCardSize()).toBe(4);
  });

  it("keeps only one request in flight and runs one pending refresh", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
    const firstRequest = deferred<Record<string, unknown>>();
    const callWS = vi
      .fn()
      .mockImplementationOnce(() => firstRequest.promise)
      .mockResolvedValue({
        [entityId]: [{ s: "healthy", a: {}, lu: 1_768_473_600 }],
      });
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({
      entity: entityId,
      hours_to_show: 24,
      refresh_interval: 15,
    });
    card.hass = createHass(callWS);
    document.body.append(card);

    await vi.advanceTimersByTimeAsync(0);
    expect(callWS).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(callWS).toHaveBeenCalledTimes(1);

    firstRequest.resolve({
      [entityId]: [{ s: "fine", a: {}, lu: 1_768_473_600 }],
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("hides only the configured header parts", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({
      entity: entityId,
      show_name: false,
      show_current_state: true,
    });
    card.hass = createHass();
    document.body.append(card);

    expect(card.shadowRoot?.querySelector(".title")).toBeNull();
    expect(card.shadowRoot?.querySelector(".header.state-only")).not.toBeNull();
    expect(card.shadowRoot?.querySelector(".current-state")).not.toBeNull();

    card.setConfig({
      entity: entityId,
      show_name: false,
      show_current_state: false,
    });
    expect(card.shadowRoot?.querySelector(".header")).toBeNull();
  });

  it("keeps the layout stable while refreshing existing history", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({
      entity: entityId,
      show_name: false,
      show_current_state: false,
      show_timeline: false,
      show_legend: false,
    });
    card.hass = createHass();
    (card as unknown as { _segments: Array<Record<string, unknown>> })._segments = [
      { state: "healthy", start: 1, end: 2 },
    ];
    (card as unknown as { _windowStart: number })._windowStart = 1;
    (card as unknown as { _windowEnd: number })._windowEnd = 2;
    (card as unknown as { _loading: boolean })._loading = true;
    (card as unknown as { render(): void }).render();

    expect(card.shadowRoot?.querySelector(".header")).toBeNull();
    expect(card.shadowRoot?.querySelector(".timeline")).toBeNull();
    expect(card.shadowRoot?.querySelector(".legend")).toBeNull();
    expect(card.shadowRoot?.querySelector(".status")).toBeNull();
    expect(card.shadowRoot?.querySelectorAll(".segment")).toHaveLength(1);
  });

  it("renders adjacent segments without a separating border", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({ entity: entityId });

    expect(card.shadowRoot?.querySelector("style")?.textContent).not.toContain(
      "border-right",
    );
  });

  it("anchors timeline lines at their exact time independently of labels", () => {
    const card = document.createElement("custom-history-bar") as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    card.setConfig({ entity: entityId, show_timeline: true });
    card.hass = createHass();
    (card as unknown as { _windowStart: number })._windowStart = Date.parse(
      "2026-07-15T22:00:00.000Z",
    );
    (card as unknown as { _windowEnd: number })._windowEnd = Date.parse(
      "2026-07-16T22:00:00.000Z",
    );
    (card as unknown as { render(): void }).render();

    const firstTick = card.shadowRoot?.querySelector<HTMLElement>(".axis-tick");
    expect(firstTick?.style.left).toBe("0.0000%");
    expect(firstTick?.classList.contains("edge-left")).toBe(false);
    expect(firstTick?.querySelector(".tick-label.edge-left")).not.toBeNull();
  });
});

describe("CustomHistoryBarEditor", () => {
  it("normalizes state keys and keeps the picker mounted during live changes", () => {
    const editor = document.createElement(
      "custom-history-bar-editor",
    ) as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    editor.setConfig({
      entity: entityId,
      state_colors: { HEALTHY: "#112233" },
    });
    editor.hass = createHass();
    document.body.append(editor);

    const input = editor.shadowRoot?.querySelector<HTMLInputElement>(
      '.state-color-text[data-state="healthy"]',
    );
    expect(input?.value).toBe("#112233");

    let changedConfig: Record<string, unknown> | undefined;
    editor.addEventListener("config-changed", (event) => {
      changedConfig = (event as CustomEvent).detail.config;
      editor.setConfig(changedConfig!);
    });
    input!.value = "#123456";
    input!.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    expect(changedConfig).toMatchObject({
      state_colors: { healthy: "#123456" },
    });

    changedConfig = undefined;
    const picker = editor.shadowRoot?.querySelector<HTMLInputElement>(
      '.state-color-picker[data-state="healthy"]',
    );
    picker!.value = "#654321";
    picker!.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    expect(changedConfig).toMatchObject({
      state_colors: { healthy: "#654321" },
    });
    expect(
      editor.shadowRoot?.querySelector('.state-color-picker[data-state="healthy"]'),
    ).toBe(picker);
  });

  it("confirms fallback and no-data colors through their pickers", () => {
    const editor = document.createElement(
      "custom-history-bar-editor",
    ) as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    editor.setConfig({ entity: entityId });
    editor.hass = createHass();
    document.body.append(editor);

    const changes: Array<Record<string, unknown>> = [];
    editor.addEventListener("config-changed", (event) => {
      changes.push((event as CustomEvent).detail.config);
    });
    const fallbackPicker = editor.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-color-field="fallback_color"]',
    );
    const noDataPicker = editor.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-color-field="no_data_color"]',
    );
    expect(fallbackPicker).not.toBeNull();
    expect(noDataPicker).not.toBeNull();

    fallbackPicker!.value = "#102030";
    fallbackPicker!.dispatchEvent(new Event("input", { bubbles: true }));
    noDataPicker!.value = "#405060";
    noDataPicker!.dispatchEvent(new Event("input", { bubbles: true }));

    expect(changes).toContainEqual(
      expect.objectContaining({ fallback_color: "#102030" }),
    );
    expect(changes).toContainEqual(
      expect.objectContaining({ no_data_color: "#405060" }),
    );
  });

  it("restores an empty number and clamps out-of-range values", () => {
    const editor = document.createElement(
      "custom-history-bar-editor",
    ) as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    editor.setConfig({ entity: entityId, hours_to_show: 24 });
    editor.hass = createHass();
    document.body.append(editor);

    const emitted: Array<Record<string, unknown>> = [];
    editor.addEventListener("config-changed", (event) => {
      emitted.push((event as CustomEvent).detail.config);
    });

    const firstInput = editor.shadowRoot?.querySelector<HTMLInputElement>(
      "#hours_to_show",
    );
    firstInput!.value = "";
    firstInput!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(emitted[emitted.length - 1]).not.toHaveProperty("hours_to_show");

    const rerenderedInput = editor.shadowRoot?.querySelector<HTMLInputElement>(
      "#hours_to_show",
    );
    rerenderedInput!.value = "9999";
    rerenderedInput!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(emitted[emitted.length - 1]).toMatchObject({ hours_to_show: 720 });
  });

  it("emits the entity-name visibility setting", () => {
    const editor = document.createElement(
      "custom-history-bar-editor",
    ) as HTMLElement & {
      hass: HomeAssistant;
      setConfig(config: Record<string, unknown>): void;
    };
    editor.setConfig({ entity: entityId });
    editor.hass = createHass();
    document.body.append(editor);

    let changedConfig: Record<string, unknown> | undefined;
    editor.addEventListener("config-changed", (event) => {
      changedConfig = (event as CustomEvent).detail.config;
    });
    const input = editor.shadowRoot?.querySelector<HTMLInputElement>(
      "#show_name",
    );
    expect(input?.checked).toBe(true);
    input!.checked = false;
    input!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(changedConfig).toMatchObject({ show_name: false });
  });
});

describe("card registration", () => {
  it("returns the Home Assistant 2026.6 entity suggestion shape", () => {
    const registration = window.customCards?.find(
      (card) => card.type === "custom-history-bar",
    );

    expect(registration?.getEntitySuggestion?.(createHass(), entityId)).toEqual({
      config: {
        type: "custom:custom-history-bar",
        entity: entityId,
      },
    });
  });
});
