const { handleError, readJsonBody, sendJson } = require('../_shared');

module.exports = async (request, response) => {
  try {
    const { learningStateService } = await import('../../apps/api/src/services/learning-state.service.js');
    const body = request.method === 'POST' ? await readJsonBody(request) : {};
    sendJson(response, 200, await learningStateService.getCurrentLesson(body?.context));
  } catch (error) {
    handleError(response, error);
  }
};
