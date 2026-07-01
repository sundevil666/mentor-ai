const { handleError, readJsonBody, sendJson, signInWithGoogleCredential } = require('../_shared');

module.exports = async (request, response) => {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { message: 'Method not allowed' });
      return;
    }

    const body = await readJsonBody(request);
    const credential = typeof body?.credential === 'string' ? body.credential : '';

    if (!credential) {
      sendJson(response, 400, { message: 'Google credential is required.' });
      return;
    }

    sendJson(response, 200, await signInWithGoogleCredential(credential));
  } catch (error) {
    handleError(response, error);
  }
};
