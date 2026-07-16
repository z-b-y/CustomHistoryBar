import { normalizeState } from "./config";
import type {
  CompressedHistoryState,
  HassEntity,
  HistoryResponse,
  HomeAssistant,
  TimelinePoint,
  TimelineSegment,
} from "./types";

export async function fetchHistory(
  hass: HomeAssistant,
  entityId: string,
  start: number,
  end: number,
): Promise<CompressedHistoryState[]> {
  const response = await hass.callWS<HistoryResponse>({
    type: "history/history_during_period",
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    entity_ids: [entityId],
    include_start_time_state: true,
    minimal_response: true,
    significant_changes_only: true,
    no_attributes: true,
  });

  return Array.isArray(response?.[entityId]) ? response[entityId] : [];
}

export function normalizeHistory(
  states: CompressedHistoryState[],
): TimelinePoint[] {
  const byTimestamp = new Map<number, TimelinePoint>();

  for (const item of states) {
    const timestampSeconds = item.lc ?? item.lu;
    const timestamp = timestampSeconds * 1000;
    if (
      typeof item.s !== "string" ||
      !Number.isFinite(timestamp) ||
      timestamp < 0
    ) {
      continue;
    }
    byTimestamp.set(timestamp, {
      state: normalizeState(item.s),
      timestamp,
    });
  }

  return [...byTimestamp.values()].sort(
    (first, second) => first.timestamp - second.timestamp,
  );
}

export function mergeCurrentState(
  states: CompressedHistoryState[],
  entity: HassEntity | undefined,
): CompressedHistoryState[] {
  if (states.length === 0 || !entity) {
    return states;
  }

  const lastChanged = Date.parse(entity.last_changed) / 1000;
  const parsedLastUpdated = Date.parse(entity.last_updated) / 1000;
  if (!Number.isFinite(lastChanged)) {
    return states;
  }

  return [
    ...states,
    {
      s: entity.state,
      a: {},
      lc: lastChanged,
      lu: Number.isFinite(parsedLastUpdated)
        ? Math.max(lastChanged, parsedLastUpdated)
        : lastChanged,
    },
  ];
}

export function buildSegments(
  states: CompressedHistoryState[],
  windowStart: number,
  windowEnd: number,
): TimelineSegment[] {
  if (
    !Number.isFinite(windowStart) ||
    !Number.isFinite(windowEnd) ||
    windowEnd <= windowStart
  ) {
    return [];
  }

  const points = normalizeHistory(states).filter(
    (point) => point.timestamp < windowEnd,
  );
  const visiblePoints: TimelinePoint[] = [];
  let stateAtWindowStart: TimelinePoint | undefined;

  for (const point of points) {
    if (point.timestamp <= windowStart) {
      stateAtWindowStart = point;
    } else {
      visiblePoints.push(point);
    }
  }

  if (stateAtWindowStart) {
    visiblePoints.unshift({
      ...stateAtWindowStart,
      timestamp: windowStart,
    });
  }

  const segments: TimelineSegment[] = [];
  for (let index = 0; index < visiblePoints.length; index += 1) {
    const point = visiblePoints[index];
    if (!point) {
      continue;
    }
    const nextPoint = visiblePoints[index + 1];
    const start = Math.max(point.timestamp, windowStart);
    const end = Math.min(nextPoint?.timestamp ?? windowEnd, windowEnd);
    if (end <= start) {
      continue;
    }

    const previous = segments[segments.length - 1];
    if (previous && previous.state === point.state && previous.end === start) {
      previous.end = end;
    } else {
      segments.push({ state: point.state, start, end });
    }
  }

  return segments;
}

export function segmentPosition(
  segment: TimelineSegment,
  windowStart: number,
  windowEnd: number,
): { left: number; width: number } {
  const duration = windowEnd - windowStart;
  if (duration <= 0) {
    return { left: 0, width: 0 };
  }
  return {
    left: ((segment.start - windowStart) / duration) * 100,
    width: ((segment.end - segment.start) / duration) * 100,
  };
}
