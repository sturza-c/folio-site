import { list, put } from '@vercel/blob';

export const LATEST_PATHNAME = 'releases/latest.json';
const FALLBACK_DOWNLOAD = 'https://folioapp.ch/assets/Folio.dmg';

export function normalizeVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '')
    .replace(/[^0-9A-Za-z._-]/g, '-')
    .slice(0, 40);
}

export function releaseMetadataPath(version) {
  return `releases/metadata/Folio-${normalizeVersion(version)}.json`;
}

export function releaseDmgPath(version) {
  return `releases/Folio-${normalizeVersion(version)}.dmg`;
}

export function fallbackRelease() {
  return {
    version: '1.4.0',
    build: '1',
    title: 'Folio 1.4.0',
    notes: 'Version actuellement proposée sur folioapp.ch.',
    downloadURL: FALLBACK_DOWNLOAD,
    filename: 'Folio.dmg',
    size: null,
    sha256: null,
    publishedAt: null,
    source: 'fallback'
  };
}

async function findBlob(pathname) {
  const result = await list({ prefix: pathname, limit: 100 });
  return result.blobs.find(blob => blob.pathname === pathname) || null;
}

async function readBlobJson(blob) {
  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Métadonnées indisponibles (${response.status}).`);
  return response.json();
}

export async function latestRelease() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fallbackRelease();
  const blob = await findBlob(LATEST_PATHNAME);
  if (!blob) return fallbackRelease();
  return { ...(await readBlobJson(blob)), source: 'blob' };
}

export async function writeReleaseMetadata(metadata) {
  const value = JSON.stringify(metadata, null, 2);
  await Promise.all([
    put(releaseMetadataPath(metadata.version), value, {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true
    }),
    put(LATEST_PATHNAME, value, {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true
    })
  ]);
  return metadata;
}

export async function releaseHistory() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [fallbackRelease()];
  const result = await list({ prefix: 'releases/metadata/', limit: 100 });
  const releases = await Promise.all(
    result.blobs
      .filter(blob => blob.pathname.endsWith('.json'))
      .map(blob => readBlobJson(blob).catch(() => null))
  );
  return releases
    .filter(Boolean)
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
}
