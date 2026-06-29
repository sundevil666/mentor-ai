const { handleError, sendJson } = require('./_shared');

module.exports = async (_request, response) => {
  try {
    const { lessonService } = await import('../apps/api/src/services/lesson.service.js');
    sendJson(response, 200, await lessonService.listLessons());
  } catch (error) {
    handleError(response, error);
  }
};
