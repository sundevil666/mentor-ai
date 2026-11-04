export async function createCachedMediaResponse(request: Request, cached: Response): Promise<Response> {
  const range = request.headers.get('range');
  if (!range) return cached;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!match) return cached;

  // Keep media as a Blob: seeking must not allocate a full recording-sized
  // ArrayBuffer plus a second copy of the requested range on the JS heap.
  const body = await cached.blob();
  const suffix = !match[1];
  const start = suffix ? Math.max(0, body.size - Number(match[2])) : Number(match[1]);
  const requestedEnd = suffix || !match[2] ? body.size - 1 : Number(match[2]);
  const end = Math.min(requestedEnd, body.size - 1);
  if ((!match[1] && !match[2]) || (suffix && Number(match[2]) === 0)
    || !Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)
    || start < 0 || start > end || start >= body.size) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${body.size}` },
    });
  }

  const headers = new Headers(cached.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Content-Range', `bytes ${start}-${end}/${body.size}`);

  return new Response(body.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}
