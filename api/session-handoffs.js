const { handleApiRequest } = require('./_handler');

module.exports = (request, response) => handleApiRequest(request, response, '/api/session-handoffs');
