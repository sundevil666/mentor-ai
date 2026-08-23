const { handleError, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const { lessonService } = await import('../apps/api/src/services/lesson.service.js');
    if (request.query?.offline === '1') {
      const requestedSince = typeof request.query.since === 'string' ? Date.parse(request.query.since) : Number.NaN;
      const defaultSince = Date.now() - 30 * 86_400_000;
      sendJson(response, 200, await lessonService.listOfflineLessons(new Date(Number.isFinite(requestedSince) ? requestedSince : defaultSince)));
      return;
    }
    sendJson(response, 200, await lessonService.listLessons());
  } catch (error) {
    handleError(response, error);
  }
};
