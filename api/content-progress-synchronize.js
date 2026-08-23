const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);
    if (user === null) return;

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    const body = await readJsonBody(request);
    const progress = Array.isArray(body?.progress) ? body.progress : [];
    sendJson(response, 200, await learningStateService.mergeContentProgress(progress, user));
  } catch (error) {
    handleError(response, error);
  }
};
