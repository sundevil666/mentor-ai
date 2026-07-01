const crypto = require('node:crypto');

exports.sendJson = (response, statusCode, data) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data }));
};

exports.getAuthConfiguration = () => ({
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  googleSignInRequired: Boolean(process.env.GOOGLE_CLIENT_ID && readAllowedEmails().length > 0),
});

exports.signInWithGoogleCredential = async (credential) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const allowedEmails = readAllowedEmails();

  if (!googleClientId || allowedEmails.length === 0) {
    const error = new Error('Google sign-in is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);

  if (!tokenInfoResponse.ok) {
    const error = new Error('Google token verification failed.');
    error.statusCode = 401;
    throw error;
  }

  const tokenInfo = await tokenInfoResponse.json();
  const email = typeof tokenInfo.email === 'string' ? tokenInfo.email.toLowerCase() : '';

  if (
    tokenInfo.aud !== googleClientId ||
    (tokenInfo.email_verified !== true && tokenInfo.email_verified !== 'true') ||
    !allowedEmails.includes(email)
  ) {
    const error = new Error('Google account is not allowed.');
    error.statusCode = 403;
    throw error;
  }

  const user = {
    id: createUserId(tokenInfo.sub || email),
    email,
    displayName: tokenInfo.name || email,
  };

  return {
    user,
    sessionToken: createSessionToken(user),
  };
};

exports.readAuthenticatedUser = (request) => {
  const token = readBearerToken(request.headers.authorization);

  return token ? verifySessionToken(token) : null;
};

exports.requireLearningIdentity = (request, response) => {
  if (!exports.getAuthConfiguration().googleSignInRequired) {
    return undefined;
  }

  const user = exports.readAuthenticatedUser(request);

  if (!user) {
    exports.sendJson(response, 401, { message: 'Google sign-in is required for cloud learning synchronization.' });
    return null;
  }

  return user;
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
  exports.sendJson(response, error.statusCode || 500, { message: error.statusCode ? error.message : 'Internal server error' });
};

function readAllowedEmails() {
  return (process.env.GOOGLE_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function createSessionToken(user) {
  const payloadBase64 = Buffer.from(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    }),
    'utf8',
  ).toString('base64url');

  return `${payloadBase64}.${signPayload(payloadBase64)}`;
}

function verifySessionToken(token) {
  const [payloadBase64, signature] = token.split('.');

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

function signPayload(payloadBase64) {
  return crypto
    .createHmac('sha256', process.env.GOOGLE_SESSION_SECRET || process.env.LESSON_IMPORT_TOKEN || 'mentor-ai-dev-secret')
    .update(payloadBase64)
    .digest('base64url');
}

function createUserId(stableGoogleSubject) {
  return `google-${crypto.createHash('sha256').update(stableGoogleSubject).digest('hex').slice(0, 24)}`;
}

function readBearerToken(value) {
  return typeof value === 'string' && value.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null;
}
