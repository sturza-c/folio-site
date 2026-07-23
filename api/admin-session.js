import { authConfigured, isAdmin } from '../lib/admin-auth.js';
import { githubReleaseConfigured } from '../lib/github-release.js';
import { methodNotAllowed, sendJson } from '../lib/http.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  return sendJson(response, 200, {
    authenticated: isAdmin(request),
    configured: authConfigured(),
    storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    githubConfigured: githubReleaseConfigured()
  });
}
