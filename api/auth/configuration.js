const { getAuthConfiguration, handleError, sendJson } = require('../_shared');

module.exports = async (_request, response) => {
  try {
    sendJson(response, 200, getAuthConfiguration());
  } catch (error) {
    handleError(response, error);
  }
};
