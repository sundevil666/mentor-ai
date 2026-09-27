const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { message: 'Method not allowed.' });
      return;
    }

    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const body = await readJsonBody(request);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const { createMovieChatReply } = await import('../apps/api/src/services/movie-chat.service.js');

    sendJson(response, 200, await createMovieChatReply(messages));
  } catch (error) {
    handleError(response, error);
  }
};
