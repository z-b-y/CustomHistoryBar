import { describe, expect, it } from "vitest";

import {
  colorForState,
  DEFAULT_CONFIG,
  DEFAULT_STATE_COLORS,
  normalizeConfig,
} from "../src/config";

describe("normalizeConfig", () => {
  it("adds defaults without adding color overrides", () => {
    const result = normalizeConfig({ entity: " sensor.health " });

    expect(result.entity).toBe("sensor.health");
    expect(result.hours_to_show).toBe(DEFAULT_CONFIG.hours_to_show);
    expect(result.refresh_interval).toBe(DEFAULT_CONFIG.refresh_interval);
    expect(result.state_colors).toEqual({});
    expect(result.show_name).toBe(true);
    expect(result.show_current_state).toBe(true);
  });

  it("preserves an explicitly hidden entity name", () => {
    expect(
      normalizeConfig({ entity: "sensor.health", show_name: false }).show_name,
    ).toBe(false);
  });

  it("normalizes raw state keys and preserves CSS colors", () => {
    const result = normalizeConfig({
      entity: "sensor.health",
      state_colors: {
        " Healthy ": " var(--healthy-color) ",
      },
      state_labels: {
        HEALTHY: " Excellent ",
      },
    });

    expect(result.state_colors).toEqual({
      healthy: "var(--healthy-color)",
    });
    expect(result.state_labels).toEqual({ healthy: "Excellent" });
  });

  it.each([
    [{ entity: "sensor.health", hours_to_show: 0 }, "hours_to_show"],
    [{ entity: "sensor.health", hours_to_show: 0.1 }, "hours_to_show"],
    [{ entity: "sensor.health", hours_to_show: 721 }, "hours_to_show"],
    [{ entity: "sensor.health", refresh_interval: 5 }, "refresh_interval"],
    [
      { entity: "sensor.health", state_colors: { healthy: "" } },
      "state_colors",
    ],
  ])("rejects invalid configuration %#", (config, expectedMessage) => {
    expect(() => normalizeConfig(config)).toThrow(expectedMessage);
  });
});

describe("colorForState", () => {
  it("uses an override, then a default and finally the fallback", () => {
    const config = normalizeConfig({
      entity: "sensor.health",
      fallback_color: "pink",
      state_colors: { healthy: "lime" },
    });

    expect(colorForState(config, "HEALTHY")).toBe("lime");
    expect(colorForState(config, "fine")).toBe(DEFAULT_STATE_COLORS.fine);
    expect(colorForState(config, "new_state")).toBe("pink");
  });
});
