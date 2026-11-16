const { handleError, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    if (new URL(request.url, 'https://localhost').searchParams.get('review') === '1') {
      if (!user) {
        sendJson(response, 401, { message: 'Sign in to download cloud lesson results.' });
        return;
      }
      response.setHeader('Cache-Control', 'private, no-store');
      sendJson(response, 200, await learningStateService.getLessonReview(user));
      return;
    }
    sendJson(response, 200, await learningStateService.getStudentState(user));
  } catch (error) {
    handleError(response, error);
  }
};
