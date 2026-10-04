export type MovieChatContentSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string };

const fencedCodeBlockPattern = /```([^\n`]*)\n?([\s\S]*?)```/g;

export function parseMovieChatContent(content: string): MovieChatContentSegment[] {
  const segments: MovieChatContentSegment[] = [];
  let textStart = 0;

  for (const match of content.matchAll(fencedCodeBlockPattern)) {
    const matchStart = match.index ?? 0;
    if (matchStart > textStart) {
      segments.push({ type: 'text', content: content.slice(textStart, matchStart) });
    }

    segments.push({
      type: 'code',
      language: (match[1] ?? '').trim(),
      content: (match[2] ?? '').replace(/\n$/, ''),
    });
    textStart = matchStart + match[0].length;
  }

  if (textStart < content.length) {
    segments.push({ type: 'text', content: content.slice(textStart) });
  }

  return segments.length ? segments : [{ type: 'text', content }];
}
