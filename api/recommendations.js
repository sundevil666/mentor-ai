const { handleError, sendJson } = require('./_shared');

module.exports = async (_request, response) => {
  try {
    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    sendJson(response, 200, await learningStateService.getRecommendations());
  } catch (error) {
    handleError(response, error);
  }
};
