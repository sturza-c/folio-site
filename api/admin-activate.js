import { requireAdmin } from '../lib/admin-auth.js';
import { methodNotAllowed, readJson, sendJson } from '../lib/http.js';
import { releaseHistory, writeReleaseMetadata } from '../lib/releases.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!requireAdmin(request, response)) return;
  try {
    const { version } = await readJson(request);
    const releases = await releaseHistory();
    const release = releases.find(item => item.version === version);
    if (!release) return sendJson(response, 404, { error: 'Cette version est introuvable.' });
    await writeReleaseMetadata({ ...release, activatedAt: new Date().toISOString() });
    return sendJson(response, 200, { ok: true, release });
  } catch (error) {
    return sendJson(response, 400, { error: error.message || 'Activation impossible.' });
  }
}
