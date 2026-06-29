let handler;

module.exports = async (request, response) => {
  if (!handler) {
    const [{ default: serverless }, { createApp }] = await Promise.all([
      import('serverless-http'),
      import('../apps/api/src/app.js'),
    ]);

    handler = serverless(createApp());
  }

  return handler(request, response);
};
