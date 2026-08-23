export type VideoSubtitleCue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export function parseWebVtt(source: string): VideoSubtitleCue[] {
  return source
    .replace(/^\uFEFF/, '')
    .split(/\r?\n\s*\r?\n/)
    .map((block, index) => parseCueBlock(block, index))
    .filter((cue): cue is VideoSubtitleCue => cue !== null);
}

function parseCueBlock(block: string, index: number): VideoSubtitleCue | null {
  const lines = block.split(/\r?\n/).map((line) => line.trim());
  const timingIndex = lines.findIndex((line) => line.includes('-->'));
  if (timingIndex < 0) return null;

  const [rawStart, rawEnd] = lines[timingIndex]!.split('-->').map((value) => value.trim().split(/\s+/)[0]);
  const start = parseTimestamp(rawStart);
  const end = parseTimestamp(rawEnd);
  const text = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
  if (start === null || end === null || end <= start || !text) return null;

  return {
    id: lines[timingIndex - 1] || `cue-${index + 1}`,
    start,
    end,
    text,
  };
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return null;
}
