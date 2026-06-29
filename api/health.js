const { sendJson } = require('./_shared');

module.exports = (_request, response) => sendJson(response, 200, { status: 'ok' });
