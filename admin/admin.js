import { upload } from 'https://esm.sh/@vercel/blob@2.4.0/client';

const $ = selector => document.querySelector(selector);
const loginView = $('#login-view');
const adminView = $('#admin-view');
const loginForm = $('#login-form');
const releaseForm = $('#release-form');
const fileInput = $('#dmg-file');
const fileDrop = $('#file-drop');
const publishButton = $('#publish-button');
const progress = $('#publish-progress');
const progressBar = $('#progress-bar');
const progressValue = $('#progress-value');
const progressLabel = $('#progress-label');
let latestVersion = null;
let githubConfigured = false;

function message(target, text, isError = false) {
  target.textContent = text || '';
  target.classList.toggle('error', isError);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  return data;
}

function formatDate(value) {
  if (!value) return 'Version incluse au site';
  return new Intl.DateTimeFormat('fr-CH', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function setAuthenticated(value) {
  loginView.hidden = value;
  adminView.hidden = !value;
  $('#logout-button').hidden = !value;
}

async function loadReleases() {
  const list = $('#release-list');
  list.innerHTML = '<p class="empty">Chargement des releases…</p>';
  try {
    const { latest, releases } = await request('/api/admin/releases');
    latestVersion = latest.version;
    $('#current-version').textContent = `Folio ${latest.version}`;
    $('#current-date').textContent = formatDate(latest.publishedAt);
    $('#current-download').href = '/api/download';
    const releaseStatus = $('#release-status');
    if (latest.github?.synced) {
      releaseStatus.textContent = 'SITE + MISES À JOUR APP';
      releaseStatus.classList.add('is-ready');
    } else if (githubConfigured) {
      releaseStatus.textContent = 'SITE ACTIF · GITHUB À VÉRIFIER';
      releaseStatus.classList.remove('is-ready');
    } else {
      releaseStatus.textContent = 'SITE ACTIF';
      releaseStatus.classList.remove('is-ready');
    }
    list.innerHTML = '';
    if (!releases.length) list.innerHTML = '<p class="empty">Aucune version publiée pour l’instant.</p>';
    releases.forEach(release => {
      const row = $('#release-template').content.firstElementChild.cloneNode(true);
      row.classList.toggle('is-current', release.version === latest.version);
      row.querySelector('strong').textContent = `Folio ${release.version}`;
      row.querySelector('small').textContent = release.version === latest.version ? 'EN LIGNE' : formatDate(release.publishedAt);
      row.querySelector('p').textContent = release.notes || 'Aucune note de version.';
      row.querySelector('.release-size').textContent = formatSize(release.size);
      const link = row.querySelector('a');
      link.href = release.downloadURL;
      const activate = row.querySelector('button');
      activate.addEventListener('click', async () => {
        activate.disabled = true;
        activate.textContent = 'Activation…';
        try {
          await request('/api/admin/activate', {
            method: 'POST',
            body: JSON.stringify({ version: release.version })
          });
          await loadReleases();
        } catch (error) {
          activate.disabled = false;
          activate.textContent = 'Remettre en ligne';
          alert(error.message);
        }
      });
      list.appendChild(row);
    });
  } catch (error) {
    list.innerHTML = `<p class="empty">${error.message}</p>`;
  }
}

async function boot() {
  try {
    const session = await request('/api/admin/session');
    githubConfigured = session.githubConfigured;
    setAuthenticated(session.authenticated);
    if (session.authenticated) await loadReleases();
    if (!session.configured) message($('#login-error'), 'Ajoute les secrets ADMIN_PASSWORD et ADMIN_SESSION_SECRET dans Vercel.', true);
  } catch (error) {
    setAuthenticated(false);
    message($('#login-error'), error.message, true);
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  message($('#login-error'), '');
  try {
    await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: $('#admin-password').value })
    });
    $('#admin-password').value = '';
    setAuthenticated(true);
    await loadReleases();
  } catch (error) {
    message($('#login-error'), error.message, true);
  } finally {
    button.disabled = false;
  }
});

$('#logout-button').addEventListener('click', async () => {
  await request('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {});
  setAuthenticated(false);
});

function showFile(file) {
  if (!file) {
    $('#file-title').textContent = 'Glisse Folio.dmg ici';
    $('#file-detail').textContent = 'ou clique pour choisir le fichier';
    return;
  }
  $('#file-title').textContent = file.name;
  $('#file-detail').textContent = `${formatSize(file.size)} · prêt à publier`;
  const match = file.name.match(/(\d+\.\d+(?:\.\d+)?)/);
  if (match && !$('#release-version').value) $('#release-version').value = match[1];
}

fileInput.addEventListener('change', () => showFile(fileInput.files?.[0]));
['dragenter', 'dragover'].forEach(type => fileDrop.addEventListener(type, event => {
  event.preventDefault();
  fileDrop.classList.add('dragging');
}));
['dragleave', 'drop'].forEach(type => fileDrop.addEventListener(type, event => {
  event.preventDefault();
  fileDrop.classList.remove('dragging');
}));
fileDrop.addEventListener('drop', event => {
  const file = [...event.dataTransfer.files].find(item => item.name.toLowerCase().endsWith('.dmg'));
  if (!file) return message($('#publish-message'), 'Choisis un fichier .dmg.', true);
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  showFile(file);
});

async function sha256(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function setProgress(value, label) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  progress.hidden = false;
  progressBar.style.width = `${percent}%`;
  progressValue.textContent = `${percent} %`;
  progressLabel.textContent = label;
}

releaseForm.addEventListener('submit', async event => {
  event.preventDefault();
  const file = fileInput.files?.[0];
  const version = $('#release-version').value.trim().replace(/^v/i, '');
  if (!file) return message($('#publish-message'), 'Ajoute d’abord le fichier Folio.dmg.', true);
  if (!file.name.toLowerCase().endsWith('.dmg')) return message($('#publish-message'), 'Le fichier doit être un DMG.', true);
  if (version === latestVersion) return message($('#publish-message'), `La version ${version} est déjà en ligne. Utilise un nouveau numéro de version.`, true);

  publishButton.disabled = true;
  message($('#publish-message'), '');
  try {
    setProgress(2, 'Calcul de l’empreinte du fichier…');
    const checksum = await sha256(file);
    setProgress(5, 'Préparation de la release…');
    const blob = await upload(`releases/Folio-${version}.dmg`, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/upload',
      multipart: file.size > 50 * 1024 * 1024,
      clientPayload: JSON.stringify({
        version,
        build: $('#release-build').value.trim(),
        notes: $('#release-notes').value.trim(),
        sha256: checksum
      }),
      onUploadProgress: ({ percentage }) => setProgress(Math.max(5, percentage), 'Envoi du DMG vers Vercel…')
    });
    setProgress(100, 'Version publiée.');
    message($('#publish-message'), `Folio ${version} est maintenant en ligne. Le téléchargement permanent a été actualisé.`);
    releaseForm.reset();
    $('#release-build').value = '1';
    showFile(null);
    await loadReleases();
    setTimeout(() => { progress.hidden = true; }, 2200);
    return blob;
  } catch (error) {
    message($('#publish-message'), error.message, true);
    progressLabel.textContent = 'Publication interrompue';
  } finally {
    publishButton.disabled = false;
  }
});

$('#refresh-releases').addEventListener('click', loadReleases);
boot();
