import { createSessionCookie, passwordMatches, authConfigured } from '../lib/admin-auth.js';
import { methodNotAllowed, readJson, sendJson } from '../lib/http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!authConfigured()) {
    return sendJson(response, 503, {
      error: 'Administration non configurée. Ajoutez ADMIN_PASSWORD et ADMIN_SESSION_SECRET dans Vercel.'
    });
  }
  try {
    const body = await readJson(request);
    if (!passwordMatches(body.password)) {
      return sendJson(response, 401, { error: 'Mot de passe incorrect.' });
    }
    response.setHeader('Set-Cookie', createSessionCookie());
    return sendJson(response, 200, { ok: true });
  } catch {
    return sendJson(response, 400, { error: 'Requête invalide.' });
  }
}
