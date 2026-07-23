const DEFAULT_REPOSITORY = 'sturza-c/folio';

function configuration() {
  return {
    token: process.env.GITHUB_RELEASE_TOKEN || '',
    repository: process.env.GITHUB_RELEASE_REPOSITORY || DEFAULT_REPOSITORY
  };
}

export function githubReleaseConfigured() {
  const { token, repository } = configuration();
  return Boolean(token && /^[^/]+\/[^/]+$/.test(repository));
}

async function github(path, options = {}) {
  const { token } = configuration();
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Folio-Release-Admin',
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `GitHub a répondu ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function findOrCreateRelease(metadata) {
  const { repository } = configuration();
  const tag = `v${metadata.version}`;
  const existing = await github(
    `/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`
  ).catch(error => {
    if (error.status === 404) return null;
    throw error;
  });

  const releaseBody = {
    tag_name: tag,
    name: metadata.title,
    body: metadata.notes || `Folio ${metadata.version}`,
    draft: false,
    prerelease: false
  };

  if (existing) {
    return github(`/repos/${repository}/releases/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseBody)
    });
  }

  return github(`/repos/${repository}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(releaseBody)
  });
}

export async function syncGitHubRelease(metadata) {
  if (!githubReleaseConfigured()) return { configured: false, synced: false };

  const { repository, token } = configuration();
  const release = await findOrCreateRelease(metadata);
  const oldAsset = (release.assets || []).find(asset => asset.name === 'Folio.dmg');
  if (oldAsset) {
    await github(`/repos/${repository}/releases/assets/${oldAsset.id}`, { method: 'DELETE' });
  }

  const dmgResponse = await fetch(metadata.downloadURL, { cache: 'no-store' });
  if (!dmgResponse.ok) {
    throw new Error(`Le DMG publié est inaccessible (${dmgResponse.status}).`);
  }
  const dmg = Buffer.from(await dmgResponse.arrayBuffer());
  const uploadURL = new URL(release.upload_url.replace('{?name,label}', ''));
  uploadURL.searchParams.set('name', 'Folio.dmg');

  const uploadResponse = await fetch(uploadURL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(dmg.length),
      'User-Agent': 'Folio-Release-Admin',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: dmg
  });
  const asset = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok) {
    throw new Error(asset?.message || `L’envoi GitHub a échoué (${uploadResponse.status}).`);
  }

  return {
    configured: true,
    synced: true,
    releaseURL: release.html_url,
    assetURL: asset.browser_download_url
  };
}
