import { describe, expect, it, vi } from "vitest";

import {
  buildSegments,
  fetchHistory,
  mergeCurrentState,
  normalizeHistory,
  segmentPosition,
} from "../src/history";
import type {
  CompressedHistoryState,
  HomeAssistant,
} from "../src/types";

const state = (
  value: string,
  seconds: number,
  lastChanged?: number,
): CompressedHistoryState => ({
  s: value,
  a: {},
  lu: seconds,
  ...(lastChanged === undefined ? {} : { lc: lastChanged }),
});

describe("normalizeHistory", () => {
  it("uses last_changed, sorts records and keeps the last duplicate", () => {
    const result = normalizeHistory([
      state("poor", 30),
      state("HEALTHY", 20, 10),
      state("fine", 10),
    ]);

    expect(result).toEqual([
      { state: "fine", timestamp: 10_000 },
      { state: "poor", timestamp: 30_000 },
    ]);
  });

  it("ignores invalid timestamps", () => {
    expect(
      normalizeHistory([
        state("healthy", Number.NaN),
        state("fine", 12),
      ]),
    ).toEqual([{ state: "fine", timestamp: 12_000 }]);
  });
});

describe("buildSegments", () => {
  it("clips the state active before the window and fills to the end", () => {
    const result = buildSegments(
      [state("healthy", 5), state("fair", 15), state("poor", 25)],
      10_000,
      30_000,
    );

    expect(result).toEqual([
      { state: "healthy", start: 10_000, end: 15_000 },
      { state: "fair", start: 15_000, end: 25_000 },
      { state: "poor", start: 25_000, end: 30_000 },
    ]);
  });

  it("leaves a no-data gap before the first known state", () => {
    expect(
      buildSegments([state("fine", 15)], 10_000, 20_000),
    ).toEqual([{ state: "fine", start: 15_000, end: 20_000 }]);
  });

  it("merges adjacent equal states", () => {
    expect(
      buildSegments(
        [state("fine", 10), state("fine", 15), state("poor", 18)],
        10_000,
        20_000,
      ),
    ).toEqual([
      { state: "fine", start: 10_000, end: 18_000 },
      { state: "poor", start: 18_000, end: 20_000 },
    ]);
  });

  it("returns no segments for an invalid window", () => {
    expect(buildSegments([state("fine", 10)], 20_000, 10_000)).toEqual(
      [],
    );
  });
});

describe("mergeCurrentState", () => {
  it("appends the current entity state to recorded history", () => {
    const recorded = [state("fine", 10)];
    const result = mergeCurrentState(recorded, {
      entity_id: "sensor.health",
      state: "healthy",
      last_changed: "1970-01-01T00:00:20.000Z",
      last_updated: "1970-01-01T00:00:21.000Z",
      attributes: {},
    });

    expect(result).toEqual([
      state("fine", 10),
      { s: "healthy", a: {}, lc: 20, lu: 21 },
    ]);
    expect(recorded).toHaveLength(1);
  });

  it("does not invent history when Recorder returned no data", () => {
    expect(
      mergeCurrentState([], {
        entity_id: "sensor.health",
        state: "healthy",
        last_changed: "1970-01-01T00:00:20.000Z",
        last_updated: "1970-01-01T00:00:21.000Z",
        attributes: {},
      }),
    ).toEqual([]);
  });
});

describe("segmentPosition", () => {
  it("converts segment times to percentages", () => {
    expect(
      segmentPosition(
        { state: "fair", start: 12_500, end: 17_500 },
        10_000,
        20_000,
      ),
    ).toEqual({ left: 25, width: 50 });
  });
});

describe("fetchHistory", () => {
  it("requests compressed significant history including the start state", async () => {
    const callWS = vi.fn().mockResolvedValue({
      "sensor.health": [state("healthy", 10)],
    });
    const hass = { callWS } as unknown as HomeAssistant;

    const result = await fetchHistory(
      hass,
      "sensor.health",
      10_000,
      20_000,
    );

    expect(result).toEqual([state("healthy", 10)]);
    expect(callWS).toHaveBeenCalledWith({
      type: "history/history_during_period",
      start_time: "1970-01-01T00:00:10.000Z",
      end_time: "1970-01-01T00:00:20.000Z",
      entity_ids: ["sensor.health"],
      include_start_time_state: true,
      minimal_response: true,
      significant_changes_only: true,
      no_attributes: true,
    });
  });

  it("returns an empty list when the entity is absent", async () => {
    const hass = {
      callWS: vi.fn().mockResolvedValue({}),
    } as unknown as HomeAssistant;
    await expect(
      fetchHistory(hass, "sensor.missing", 10_000, 20_000),
    ).resolves.toEqual([]);
  });
});
