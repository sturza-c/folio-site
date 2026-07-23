import { latestRelease } from '../lib/releases.js';
import { methodNotAllowed, sendJson } from '../lib/http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(response, ['GET', 'HEAD']);
  }
  try {
    const release = await latestRelease();
    response.statusCode = 307;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Location', release.downloadURL);
    return response.end();
  } catch (error) {
    return sendJson(response, 500, { error: error.message || 'Téléchargement indisponible.' });
  }
}
