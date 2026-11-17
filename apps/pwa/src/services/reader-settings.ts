export const minReaderFontSize = 14;
export const maxReaderFontSize = 32;
export const minReaderSidebarScale = 0;
export const maxReaderSidebarScale = 4;

const readerSidebarScaleKey = 'mentor-ai:personal-reader-sidebar-scale';

export function readReaderSidebarScale() {
  if (typeof localStorage === 'undefined') return minReaderSidebarScale;
  const value = Number(localStorage.getItem(readerSidebarScaleKey));
  return Number.isInteger(value)
    ? Math.max(minReaderSidebarScale, Math.min(maxReaderSidebarScale, value))
    : minReaderSidebarScale;
}

export function saveReaderSidebarScale(value: number) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(readerSidebarScaleKey, String(value));
}

export function bookReaderSettingsKey(bookId: string) {
  return `mentor-ai:personal-book-reader-settings:${bookId}`;
}

export function readBookReaderSettings(bookId: string): { fontSize: number } {
  if (typeof localStorage === 'undefined') return { fontSize: 20 };
  try {
    const parsed = JSON.parse(localStorage.getItem(bookReaderSettingsKey(bookId)) ?? 'null') as { fontSize?: number } | null;
    const fontSize = Math.max(minReaderFontSize, Math.min(maxReaderFontSize, Number(parsed?.fontSize) || 20));
    return { fontSize };
  } catch {
    return { fontSize: 20 };
  }
}

export function saveBookReaderSettings(bookId: string, fontSize: number) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(bookReaderSettingsKey(bookId), JSON.stringify({ fontSize }));
}

export function formatBookPartLabel(index: number, title?: string) {
  const normalizedTitle = title?.replace(/\s+/g, ' ').trim();
  const genericTitle = normalizedTitle && !/^part\s+\d+$/i.test(normalizedTitle) ? normalizedTitle : 'Part';
  return `${index + 1}. ${genericTitle}`;
}

export function splitBookParagraphs(text: string) {
  return text.split('\n').filter(Boolean);
}

export function tokenizeReaderParagraph(text: string): Array<{ text: string; isWord: boolean }> {
  return text.split(/([\p{L}]+(?:[-'’][\p{L}]+)*)/gu).filter(Boolean).map((token) => ({
    text: token,
    isWord: /^[\p{L}]+(?:[-'’][\p{L}]+)*$/u.test(token),
  }));
}

export function clampProgressRatio(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.min(1, numericValue)) : 0;
}
