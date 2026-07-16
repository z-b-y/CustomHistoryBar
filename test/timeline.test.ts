import { describe, expect, it } from "vitest";

import { buildFourHourTicks, buildStateChangeTicks } from "../src/timeline";

const hour = 60 * 60 * 1000;

describe("buildFourHourTicks", () => {
  it("places six ticks at local four-hour boundaries in a 24-hour window", () => {
    const ticks = buildFourHourTicks(
      Date.parse("2026-07-15T20:30:00.000Z"),
      Date.parse("2026-07-16T20:30:00.000Z"),
      "Europe/Prague",
    );

    expect(ticks.map((tick) => tick.label)).toEqual([
      "16. 7.",
      "4:00",
      "8:00",
      "12:00",
      "16:00",
      "20:00",
    ]);
  });

  it("keeps local boundaries across the spring DST transition", () => {
    const ticks = buildFourHourTicks(
      Date.parse("2026-03-28T22:00:00.000Z"),
      Date.parse("2026-03-29T07:00:00.000Z"),
      "Europe/Prague",
    );

    expect(ticks.map((tick) => tick.label)).toEqual([
      "29. 3.",
      "4:00",
      "8:00",
    ]);
    expect(ticks[1]!.timestamp - ticks[0]!.timestamp).toBe(3 * hour);
  });

  it("keeps local boundaries across the autumn DST transition", () => {
    const ticks = buildFourHourTicks(
      Date.parse("2026-10-24T21:00:00.000Z"),
      Date.parse("2026-10-25T08:00:00.000Z"),
      "Europe/Prague",
    );

    expect(ticks.map((tick) => tick.label)).toEqual([
      "25. 10.",
      "4:00",
      "8:00",
    ]);
    expect(ticks[1]!.timestamp - ticks[0]!.timestamp).toBe(5 * hour);
  });
});

describe("buildStateChangeTicks", () => {
  it("shows real transitions and suppresses gaps and main-tick duplicates", () => {
    const mainTicks = buildFourHourTicks(0, 24 * hour, "UTC");
    const ticks = buildStateChangeTicks(
      [
        { state: "healthy", start: 0, end: 4 * hour },
        { state: "fair", start: 4 * hour, end: 5 * hour },
        { state: "poor", start: 6 * hour, end: 7 * hour },
        { state: "healthy", start: 7 * hour, end: 24 * hour },
      ],
      0,
      24 * hour,
      "UTC",
      mainTicks,
    );

    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toMatchObject({ label: "7:00", state: "healthy" });
  });
});
