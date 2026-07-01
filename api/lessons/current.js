const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('../_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../../apps/api/src/services/learning-state.service.js');
    const body = request.method === 'POST' ? await readJsonBody(request) : {};
    sendJson(response, 200, await learningStateService.getCurrentLesson(body?.context, user));
  } catch (error) {
    handleError(response, error);
  }
};
