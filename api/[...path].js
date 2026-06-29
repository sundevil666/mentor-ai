let handler;

module.exports = async (request, response) => {
  if (!handler) {
    const [{ default: serverless }, { createApp }] = await Promise.all([
      import('serverless-http'),
      import('../apps/api/src/app.js'),
    ]);

    handler = serverless(createApp());
  }

  const routePath = readRoutePath(request);

  if (routePath) {
    request.url = `/api/${routePath}`;
  }

  return handler(request, response);
};

function readRoutePath(request) {
  const value = request.query?.['...path'] ?? request.query?.path;

  if (Array.isArray(value)) {
    return value.join('/');
  }

  return typeof value === 'string' ? value : '';
}
