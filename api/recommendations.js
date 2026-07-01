const { handleError, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    sendJson(response, 200, await learningStateService.getRecommendations(user));
  } catch (error) {
    handleError(response, error);
  }
};
