const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');

    if (request.method === 'GET') {
      sendJson(response, 200, await learningStateService.getReadingResumeSnapshot(String(request.query?.bookId || ''), user));
      return;
    }

    if (request.method === 'PUT') {
      sendJson(response, 200, await learningStateService.upsertReadingDeviceSession(await readJsonBody(request), user));
      return;
    }

    sendJson(response, 405, { message: 'Method not allowed.' });
  } catch (error) {
    handleError(response, error);
  }
};
