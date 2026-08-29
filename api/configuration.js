const { handleError, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    if (request.query?.health === '1') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    sendJson(response, 200, await learningStateService.getConfiguration());
  } catch (error) {
    handleError(response, error);
  }
};
