import { requireAdmin } from '../lib/admin-auth.js';
import { methodNotAllowed, sendJson } from '../lib/http.js';
import { latestRelease, releaseHistory } from '../lib/releases.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  if (!requireAdmin(request, response)) return;
  try {
    const [latest, releases] = await Promise.all([latestRelease(), releaseHistory()]);
    return sendJson(response, 200, { latest, releases });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || 'Impossible de lire les releases.' });
  }
}
