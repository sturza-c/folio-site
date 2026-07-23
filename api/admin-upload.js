import { handleUpload } from '@vercel/blob/client';
import { requireAdmin } from '../lib/admin-auth.js';
import { syncGitHubRelease } from '../lib/github-release.js';
import { methodNotAllowed, readJson, sendJson } from '../lib/http.js';
import { normalizeVersion, releaseDmgPath, writeReleaseMetadata } from '../lib/releases.js';

function parsePayload(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!requireAdmin(request, response)) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendJson(response, 503, { error: 'Le stockage Vercel Blob n’est pas configuré.' });
  }

  try {
    const body = await readJson(request);
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const data = parsePayload(clientPayload);
        const version = normalizeVersion(data.version);
        if (!/^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
          throw new Error('Indiquez une version valide, par exemple 1.4.0.');
        }
        return {
          allowedContentTypes: [
            'application/x-apple-diskimage',
            'application/octet-stream'
          ],
          maximumSizeInBytes: 1024 * 1024 * 500,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            version,
            build: String(data.build || '1').slice(0, 20),
            notes: String(data.notes || '').slice(0, 12000),
            sha256: String(data.sha256 || '').slice(0, 64)
          })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const data = parsePayload(tokenPayload);
        const version = normalizeVersion(data.version);
        if (blob.pathname !== releaseDmgPath(version)) {
          throw new Error('Le nom de la release ne correspond pas à sa version.');
        }
        const metadata = await writeReleaseMetadata({
          version,
          build: data.build,
          title: `Folio ${version}`,
          notes: data.notes,
          downloadURL: blob.url,
          filename: `Folio-${version}.dmg`,
          pathname: blob.pathname,
          size: blob.size,
          sha256: data.sha256 || null,
          publishedAt: new Date().toISOString()
        });
        try {
          metadata.github = await syncGitHubRelease(metadata);
        } catch (error) {
          console.error('Folio GitHub release sync error', error);
          metadata.github = {
            configured: true,
            synced: false,
            error: error.message || 'Synchronisation GitHub impossible.'
          };
        }
        await writeReleaseMetadata(metadata);
      }
    });
    return sendJson(response, 200, result);
  } catch (error) {
    console.error('Folio upload error', error);
    return sendJson(response, 400, { error: error.message || 'La publication a échoué.' });
  }
}
