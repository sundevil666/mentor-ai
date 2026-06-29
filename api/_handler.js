let handler;

exports.handleApiRequest = async (request, response, apiPath) => {
  if (!handler) {
    const [{ default: serverless }, { createApp }] = await Promise.all([
      import('serverless-http'),
      import('../apps/api/src/app.js'),
    ]);

    handler = serverless(createApp());
  }

  request.url = apiPath;
  return handler(request, response);
};
