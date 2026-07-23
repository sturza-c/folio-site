import { latestRelease } from '../lib/releases.js';
import { methodNotAllowed, sendJson } from '../lib/http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  try {
    return sendJson(response, 200, await latestRelease());
  } catch (error) {
    return sendJson(response, 500, { error: error.message || 'Release indisponible.' });
  }
}
