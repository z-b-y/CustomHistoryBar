import type { ResolvedHistoryBarConfig } from "./types";

const CARD_PADDING_HEIGHT = 32;
const BAR_HEIGHT = 30;
const HEADER_HEIGHT = 32;
const TIMELINE_HEIGHT = 42;
const LEGEND_MIN_HEIGHT = 28;
const MASONRY_SIZE_HEIGHT = 50;

export const estimateCardHeight = (
  config?: ResolvedHistoryBarConfig,
): number => {
  if (!config) {
    return MASONRY_SIZE_HEIGHT;
  }

  const hasHeader = config.show_name || config.show_current_state;
  return (
    CARD_PADDING_HEIGHT +
    BAR_HEIGHT +
    (hasHeader ? HEADER_HEIGHT : 0) +
    (config.show_timeline ? TIMELINE_HEIGHT : 0) +
    (config.show_legend ? LEGEND_MIN_HEIGHT : 0)
  );
};

export const masonrySizeForHeight = (height: number): number =>
  Math.max(1, Math.ceil(height / MASONRY_SIZE_HEIGHT));
