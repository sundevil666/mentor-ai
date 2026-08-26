export async function createCachedMediaResponse(request: Request, cached: Response): Promise<Response> {
  const range = request.headers.get('range');
  if (!range) return cached;

  const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
  if (!match) return cached;

  const body = await cached.arrayBuffer();
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : body.byteLength - 1;
  const end = Math.min(requestedEnd, body.byteLength - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= body.byteLength) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${body.byteLength}` },
    });
  }

  const headers = new Headers(cached.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Content-Range', `bytes ${start}-${end}/${body.byteLength}`);

  return new Response(body.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}
