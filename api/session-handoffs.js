const { handleError, readJsonBody, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');

    if (request.method === 'PUT') {
      sendJson(response, 200, await learningStateService.upsertSessionHandoff(await readJsonBody(request)));
      return;
    }

    sendJson(response, 200, await learningStateService.listSessionHandoffs());
  } catch (error) {
    handleError(response, error);
  }
};
