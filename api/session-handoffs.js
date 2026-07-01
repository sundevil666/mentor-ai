const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');

    if (request.method === 'PUT') {
      sendJson(response, 200, await learningStateService.upsertSessionHandoff(await readJsonBody(request), user));
      return;
    }

    sendJson(response, 200, await learningStateService.listSessionHandoffs(user));
  } catch (error) {
    handleError(response, error);
  }
};
