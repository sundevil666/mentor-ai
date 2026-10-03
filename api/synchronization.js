const { handleError, readJsonBody, requireLearningIdentity, sendJson } = require('./_shared');

module.exports = async (request, response) => {
  try {
    const user = requireLearningIdentity(request, response);

    if (user === null) {
      return;
    }

    const body = await readJsonBody(request);
    if (request.query?.action === 'movie-chat') {
      if (request.method !== 'POST') {
        sendJson(response, 405, { message: 'Method not allowed.' });
        return;
      }
      const messages = Array.isArray(body?.messages) ? body.messages : [];
      const { createMovieChatReply } = await import('../apps/api/src/services/movie-chat.service.js');
      sendJson(response, 200, await createMovieChatReply(
        messages,
        typeof body?.prompt === 'string' ? body.prompt : '',
        typeof body?.memory === 'string' ? body.memory : '',
      ));
      return;
    }
    if (request.query?.action === 'movie-reports') {
      const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
      if (request.method === 'GET') {
        sendJson(response, 200, await learningStateService.listMovieLearningReports(user));
        return;
      }
      if (request.method === 'POST') {
        const reports = Array.isArray(body?.reports) ? body.reports : [];
        sendJson(response, 200, await learningStateService.mergeMovieLearningReports(reports, user));
        return;
      }
      if (request.method === 'DELETE') {
        sendJson(response, 200, await learningStateService.deleteMovieLearningReport(
          typeof body?.reportId === 'string' ? body.reportId : '',
          user,
        ));
        return;
      }
      sendJson(response, 405, { message: 'Method not allowed.' });
      return;
    }
    if (request.query?.action === 'books') {
      if (!user) {
        sendJson(response, 401, { message: 'Google sign-in is required for cloud book synchronization.' });
        return;
      }
      const books = Array.isArray(body?.books) ? body.books : [];
      const service = await import('../apps/api/src/services/personal-reading-books.service.js');
      sendJson(response, 200, await service.synchronizePersonalReadingBooks(books, user));
      return;
    }
    if (request.query?.action === 'reading-transcript') {
      if (!user) {
        sendJson(response, 401, { message: 'Google sign-in is required to save reading transcripts.' });
        return;
      }
      const chunks = Array.isArray(body?.chunks) ? body.chunks : [];
      const service = await import('../apps/api/src/services/reading-transcripts.service.js');
      sendJson(response, 200, await service.storeReadingTranscripts(chunks, user));
      return;
    }

    const { learningStateService } = await import('../apps/api/src/services/learning-state.service.js');
    if (request.query?.action === 'reading-resume') {
      if (request.method === 'GET') {
        sendJson(response, 200, await learningStateService.getReadingResumeSnapshot(String(request.query?.bookId || ''), user));
        return;
      }
      if (request.method === 'PUT') {
        sendJson(response, 200, await learningStateService.upsertReadingDeviceSession(body, user));
        return;
      }
      sendJson(response, 405, { message: 'Method not allowed.' });
      return;
    }
    if (Array.isArray(body?.progress)) {
      sendJson(response, 200, await learningStateService.mergeContentProgress(body.progress, user));
      return;
    }
    if (Array.isArray(body?.engagementEvents)) {
      sendJson(response, 200, await learningStateService.mergeContentEngagementEvents(body.engagementEvents, user));
      return;
    }
    if (Array.isArray(body?.activityEvents)) {
      sendJson(response, 200, await learningStateService.mergeLearningActivityEvents(
        body.activityEvents,
        user,
        body.activityTotalsSnapshot,
      ));
      return;
    }
    if (Array.isArray(body?.statisticsSnapshots)) {
      sendJson(response, 200, await learningStateService.mergeStatisticsSnapshots(body.statisticsSnapshots, user));
      return;
    }
    const events = Array.isArray(body?.events) ? body.events : [];
    const exerciseResults = Array.isArray(body?.exerciseResults) ? body.exerciseResults : [];
    const speechResults = Array.isArray(body?.speechResults) ? body.speechResults : [];

    sendJson(response, 200, await learningStateService.synchronize(events, exerciseResults, speechResults, user));
  } catch (error) {
    handleError(response, error);
  }
};
