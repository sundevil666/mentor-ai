exports.sendJson = (response, statusCode, data) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data }));
};

exports.readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    if (request.body && typeof request.body === 'object') {
      resolve(request.body);
      return;
    }

    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });

exports.handleError = (response, error) => {
  console.error(error);
  exports.sendJson(response, 500, { message: 'Internal server error' });
};
