import { CustomHistoryBar } from "./custom-history-bar";
import { CustomHistoryBarEditor } from "./custom-history-bar-editor";
import type { HomeAssistant } from "./types";

const CARD_TAG = "custom-history-bar";
const EDITOR_TAG = "custom-history-bar-editor";

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, CustomHistoryBarEditor);
}
if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, CustomHistoryBar);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: "Custom History Bar",
    description: "A configurable colored history bar for enum entities",
    preview: true,
    getEntitySuggestion: (hass: HomeAssistant, entityId: string) => {
      const entity = hass.states[entityId];
      return entity && Array.isArray(entity.attributes.options)
        ? {
            config: {
              type: `custom:${CARD_TAG}`,
              entity: entityId,
            },
          }
        : null;
    },
  });
}

console.info(
  "%c CUSTOM-HISTORY-BAR %c 0.1.0 ",
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;",
);
