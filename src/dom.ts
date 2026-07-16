export const escapeHtml = (value: unknown): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const escapeAttribute = escapeHtml;

export const isHexColor = (value: string): boolean =>
  /^#[0-9a-f]{6}$/i.test(value);
