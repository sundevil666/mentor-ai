const { handleError, readJsonBody, sendJson } = require('../../_shared');

module.exports = async (request, response) => {
  try {
    const [{ config }, { lessonService }] = await Promise.all([
      import('../../../apps/api/src/config/env.js'),
      import('../../../apps/api/src/services/lesson.service.js'),
    ]);
    const expected = config.lessonImportToken;

    if (!expected || request.headers.authorization !== `Bearer ${expected}`) {
      sendJson(response, 401, { message: 'Unauthorized' });
      return;
    }

    const body = await readJsonBody(request);
    const lessons = Array.isArray(body?.lessons) ? body.lessons : [];
    sendJson(response, 200, await lessonService.importPrivateLessons(lessons));
  } catch (error) {
    handleError(response, error);
  }
};
