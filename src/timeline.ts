import type { TimelineSegment, TimelineTick } from "./types";

const SCAN_STEP = 15 * 60 * 1000;
const MAIN_TICK_HOURS = 4;
const MAIN_TICK_TOLERANCE = 60 * 1000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone?: string): Intl.DateTimeFormat => {
  const cacheKey = timeZone || "__local__";
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB-u-hc-h23", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-GB-u-hc-h23", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
  formatterCache.set(cacheKey, formatter);
  return formatter;
};

export const clockParts = (
  timestamp: number,
  timeZone?: string,
): { hour: number; minute: number } => {
  const parts = formatterFor(timeZone).formatToParts(timestamp);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return { hour: hour % 24, minute };
};

export const clockLabel = (timestamp: number, timeZone?: string): string => {
  const { hour, minute } = clockParts(timestamp, timeZone);
  return `${hour}:${String(minute).padStart(2, "0")}`;
};

const tickPosition = (
  timestamp: number,
  windowStart: number,
  windowEnd: number,
): number => ((timestamp - windowStart) / (windowEnd - windowStart)) * 100;

export function buildFourHourTicks(
  windowStart: number,
  windowEnd: number,
  timeZone?: string,
): TimelineTick[] {
  if (
    !Number.isFinite(windowStart) ||
    !Number.isFinite(windowEnd) ||
    windowEnd <= windowStart
  ) {
    return [];
  }

  const firstCandidate = Math.ceil(windowStart / SCAN_STEP) * SCAN_STEP;
  const ticks: TimelineTick[] = [];
  for (
    let timestamp = firstCandidate;
    timestamp <= windowEnd;
    timestamp += SCAN_STEP
  ) {
    const { hour, minute } = clockParts(timestamp, timeZone);
    if (minute !== 0 || hour % MAIN_TICK_HOURS !== 0) {
      continue;
    }
    ticks.push({
      timestamp,
      position: tickPosition(timestamp, windowStart, windowEnd),
      label: `${hour}:00`,
    });
  }
  return ticks;
}

export function buildStateChangeTicks(
  segments: TimelineSegment[],
  windowStart: number,
  windowEnd: number,
  timeZone?: string,
  mainTicks: TimelineTick[] = [],
): TimelineTick[] {
  if (windowEnd <= windowStart) {
    return [];
  }

  const ticks: TimelineTick[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    if (
      !previous ||
      !current ||
      previous.end !== current.start ||
      previous.state === current.state ||
      current.start <= windowStart ||
      current.start >= windowEnd ||
      mainTicks.some(
        (tick) =>
          Math.abs(tick.timestamp - current.start) <= MAIN_TICK_TOLERANCE,
      )
    ) {
      continue;
    }
    ticks.push({
      timestamp: current.start,
      position: tickPosition(current.start, windowStart, windowEnd),
      label: clockLabel(current.start, timeZone),
      state: current.state,
    });
  }
  return ticks;
}
