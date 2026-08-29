const { handleError, readJsonBody, readAuthenticatedUser, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { message: 'Method not allowed.' });
      return;
    }

    const user = readAuthenticatedUser(request);
    if (!user) {
      sendJson(response, 401, { message: 'Google sign-in is required for cloud book synchronization.' });
      return;
    }

    const body = await readJsonBody(request);
    const books = Array.isArray(body?.books) ? body.books : [];
    const service = await import('../apps/api/src/services/personal-reading-books.service.js');
    sendJson(response, 200, await service.synchronizePersonalReadingBooks(books, user));
  } catch (error) {
    handleError(response, error);
  }
};
