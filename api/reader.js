const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);
    if (user === null) return;

    const action = request.query?.action;
    const usageService = await import('../apps/api/src/services/translation-usage.service.js');

    if (action === 'usage' && request.method === 'GET') {
      sendJson(response, 200, await usageService.getTranslationUsage());
      return;
    }

    if (action === 'lookup' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const lookupService = await import('../apps/api/src/services/reader-lookup.service.js');
      sendJson(response, 200, await lookupService.lookupReaderText(body?.text));
      return;
    }

    sendJson(response, 404, { message: 'Reader endpoint not found.' });
  } catch (error) {
    handleError(response, error);
  }
};
