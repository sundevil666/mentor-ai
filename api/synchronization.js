const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    const body = await readJsonBody(request);
    const events = Array.isArray(body?.events) ? body.events : [];
    const exerciseResults = Array.isArray(body?.exerciseResults) ? body.exerciseResults : [];
    const speechResults = Array.isArray(body?.speechResults) ? body.speechResults : [];

    sendJson(response, 200, await learningStateService.synchronize(events, exerciseResults, speechResults, user));
  } catch (error) {
    handleError(response, error);
  }
};
