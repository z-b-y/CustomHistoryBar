// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/index";
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
});

describe("CustomHistoryBarEditor", () => {
  it("normalizes state keys and emits live color changes", () => {
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
    });
    input!.value = "#123456";
    input!.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    expect(changedConfig).toMatchObject({
      state_colors: { healthy: "#123456" },
    });
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
