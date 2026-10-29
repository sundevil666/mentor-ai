const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);
    if (user === null) return;

    const action = request.query?.action;
    if (action === 'book-analytics' && request.method === 'POST') {
      if (!user) { sendJson(response, 401, { message: 'Sign in to save book reading analytics.' }); return; }
      const body = await readJsonBody(request);
      const analytics = await import('../apps/api/src/services/book-reading-analytics.service.js');
      try {
        sendJson(response, 200, await analytics.storeBookReadingAnalytics(body?.books, user));
      } catch (error) {
        if (error instanceof RangeError) { sendJson(response, 400, { message: error.message }); return; }
        throw error;
      }
      return;
    }

    const usageService = await import('../apps/api/src/services/translation-usage.service.js');

    if (action === 'usage' && request.method === 'GET') {
      sendJson(response, 200, await usageService.getTranslationUsage());
      return;
    }

    if (action === 'usage' && request.method === 'POST') {
      const body = await readJsonBody(request);
      sendJson(response, 200, await usageService.synchronizeTranslationUsageDevice(body ?? {}));
      return;
    }

    if (action === 'lookup' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const lookupService = await import('../apps/api/src/services/reader-lookup.service.js');
      sendJson(response, 200, await lookupService.lookupReaderText(body?.text));
      return;
    }

    if (action === 'phonetic' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const lookupService = await import('../apps/api/src/services/reader-lookup.service.js');
      sendJson(response, 200, await lookupService.lookupReaderPhonetic(body?.text));
      return;
    }

    sendJson(response, 404, { message: 'Reader endpoint not found.' });
  } catch (error) {
    handleError(response, error);
  }
};
