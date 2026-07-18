const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = value => JSON.parse(JSON.stringify(value));
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const plain = html => {
  const node = document.createElement('div');
  node.innerHTML = String(html ?? '');
  return node.textContent.trim();
};

const marketingView = $('#marketing-view');
const appView = $('#app-view');
const webShell = $('#web-shell');
const sidebar = $('#web-sidebar');
const slashMenu = $('#app-slash-menu');
const blockMenu = $('#app-block-menu');
const commandPalette = $('#command-palette');
const exportDialog = $('#export-dialog');
const profileDialog = $('#profile-dialog');
const downloadDialog = $('#download-dialog');
const supportDialog = $('#support-dialog');
const toast = $('.toast');
const folioDownloadUrl = 'assets/Folio.dmg?build=20260718-vf';

const initialPages = [
  {
    id: 'psychology', title: 'Psychologie cognitive', subtitle: 'Cours du 13 juillet', project: 'Semestre 1', edited: 'Il y a 16 min', cover: 'cover-ink',
    blocks: [
      { id: 'p1', type: 'paragraph', html: 'La mémoire de travail maintient temporairement les informations nécessaires au raisonnement et à la prise de décision.' },
      { id: 'p2', type: 'heading1', html: 'Modèle de Baddeley' },
      { id: 'p3', type: 'paragraph', html: 'Le modèle distingue un administrateur central et plusieurs systèmes esclaves spécialisés.' },
      { id: 'p4', type: 'todo', html: 'Boucle phonologique', checked: true },
      { id: 'p5', type: 'todo', html: 'Calepin visuospatial', checked: false },
      { id: 'p6', type: 'quote', html: 'La capacité est limitée ; l’organisation réduit la charge cognitive.' },
      { id: 'p7', type: 'heading2', html: 'Capacité et attention' },
      { id: 'p-columns', type: 'columns2', html: '', columns: [
        [{ id:'pc1', type:'heading3', html:'À comprendre' },{ id:'pc2', type:'paragraph', html:'L’administrateur central dirige l’attention et coordonne les tâches.' }],
        [{ id:'pc3', type:'heading3', html:'À retenir' },{ id:'pc4', type:'todo', html:'Réviser la boucle phonologique', checked:false }]
      ] },
      { id: 'p8', type: 'table', cells: [['Composant','Fonction'],['Administrateur central','Dirige l’attention'],['Boucle phonologique','Traite l’information verbale']] }
    ]
  },
  {
    id: 'methods', title: 'Méthodes de recherche', subtitle: 'Projet de semestre', project: 'Semestre 1', edited: 'Il y a 1 h', cover: 'cover-blue',
    blocks: [
      { id: 'm1', type: 'heading1', html: 'Protocole' },
      { id: 'm2', type: 'paragraph', html: 'Une étude intra-sujets expose chaque participant aux mêmes conditions expérimentales.' },
      { id: 'm3', type: 'bullet', html: '<b>Variable indépendante :</b> durée de sommeil' },
      { id: 'm4', type: 'bullet', html: '<b>Variable dépendante :</b> score de mémoire de travail' },
      { id: 'm5', type: 'todo', html: 'Préparer le formulaire de consentement', checked: false }
    ]
  },
  {
    id: 'statistics', title: 'Statistiques', subtitle: 'Cours et exercices', project: 'Semestre 1', edited: 'Hier', cover: 'cover-steel',
    blocks: [
      { id: 's1', type: 'heading1', html: 'Régression linéaire' },
      { id: 's2', type: 'paragraph', html: 'La régression décrit la relation entre une variable dépendante et une ou plusieurs variables explicatives.' },
      { id: 's3', type: 'quote', html: 'R² représente la part de variance expliquée par le modèle.' }
    ]
  },
  {
    id: 'sociology', title: 'Sociologie', subtitle: 'Notes du semestre', project: 'Semestre 1', edited: 'Hier', cover: 'cover-violet',
    blocks: [
      { id: 'o1', type: 'heading1', html: 'Socialisation' },
      { id: 'o2', type: 'paragraph', html: 'La socialisation secondaire poursuit l’apprentissage de nouveaux rôles et normes.' }
    ]
  },
  {
    id: 'outline', title: 'Plan du mémoire', subtitle: 'Projet de semestre', project: 'Projet de semestre', edited: 'Jeudi', cover: 'cover-paper',
    blocks: [
      { id: 'o3', type: 'heading1', html: 'Plan provisoire' },
      { id: 'o4', type: 'numbered', html: 'Cadre théorique' },
      { id: 'o5', type: 'numbered', html: 'Méthode' },
      { id: 'o6', type: 'numbered', html: 'Résultats' },
      { id: 'o7', type: 'numbered', html: 'Discussion' }
    ]
  }
];

const studyCards = [
  { deck:'PSYCHOLOGIE COGNITIVE', question:'Qu’est-ce que la mémoire de travail ?', answer:'Un système cognitif à capacité limitée qui maintient et manipule temporairement l’information utile à une tâche.' },
  { deck:'PSYCHOLOGIE COGNITIVE', question:'Quel est le rôle de l’administrateur central ?', answer:'Il dirige l’attention et coordonne les systèmes spécialisés.' },
  { deck:'MÉTHODES DE RECHERCHE', question:'Qu’est-ce qu’un plan intra-sujets ?', answer:'Chaque participant est exposé à toutes les conditions expérimentales.' },
  { deck:'STATISTIQUES', question:'Que représente R² ?', answer:'La proportion de variance expliquée par le modèle.' }
];

const storageKey = 'folio-site-real-product-v2';
const defaultProfile = { name:'Camille', avatar:null, showDetails:true, showClock:true, showPreview:true, accent:'#83a8da' };
const defaultCustomization = { homeCover:null, toolCovers:{} };
let state = loadState();
let currentPageId = state.pages[0]?.id;
let currentRoute = 'home';
let activeBlockId = null;
let draggedBlockId = null;
let draggedColumnItem = null;
let pointerDragClickGuard = false;
let studyIndex = 0;
let answerVisible = false;
let pageFontIndex = 0;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.pages?.length) return {
      pages: saved.pages,
      cards: saved.cards || clone(studyCards),
      events: saved.events || [],
      profile: { ...defaultProfile, ...(saved.profile || {}) },
      customization: { ...defaultCustomization, ...(saved.customization || {}), toolCovers:{ ...(saved.customization?.toolCovers || {}) } }
    };
  } catch (_) {}
  return { pages: clone(initialPages), cards: clone(studyCards), events: [], profile:clone(defaultProfile), customization:clone(defaultCustomization) };
}

function saveState() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function setExperience(view, updateHistory = true) {
  const appOpen = view === 'app';
  const swap = () => {
    marketingView.hidden = appOpen;
    appView.hidden = !appOpen;
    document.body.classList.toggle('app-open', appOpen);
    $('.site-header .app-action').textContent = appOpen ? 'Retour au site' : 'Ouvrir Folio Web';
    $('.site-header .mobile-app').textContent = appOpen ? 'Retour' : 'Ouvrir';
    if (updateHistory) history.replaceState(null, '', appOpen ? '#web' : location.pathname);
    if (appOpen) {
      renderNavigation();
      renderHomePages();
      renderAllNotes();
      openRoute(currentRoute);
    } else {
      closeFloatingUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion:reduce)').matches) document.startViewTransition(swap);
  else swap();
}

$$('.js-app').forEach(button => button.addEventListener('click', () => {
  const isHeaderToggle = button.closest('.site-header');
  setExperience(isHeaderToggle && !appView.hidden ? 'site' : 'app');
}));
$$('.js-site').forEach(button => button.addEventListener('click', () => setExperience('site')));
const downloadFolio = () => {
  const link = document.createElement('a');
  link.href = folioDownloadUrl;
  link.download = 'Folio.dmg';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

let installStep = 0;
const setInstallStep = step => {
  installStep = Math.max(0, Math.min(3, step));
  $$('[data-install-step]').forEach((button, index) => {
    const active = index === installStep;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('[data-install-panel]').forEach((panel, index) => {
    const active = index === installStep;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  $('#install-prev').disabled = installStep === 0;
  $('#install-next').textContent = installStep === 3 ? 'Terminé' : 'Continuer';
};

$$('.js-download').forEach(button => button.addEventListener('click', () => {
  downloadFolio();
  setInstallStep(0);
  downloadDialog.showModal();
}));
$('#install-retry').addEventListener('click', () => { downloadFolio(); showToast('Le téléchargement de Folio a redémarré.'); });
$$('[data-install-step]').forEach(button => button.addEventListener('click', () => setInstallStep(Number(button.dataset.installStep))));
$('#install-prev').addEventListener('click', () => setInstallStep(installStep - 1));
$('#install-next').addEventListener('click', () => installStep === 3 ? downloadDialog.close() : setInstallStep(installStep + 1));
$('.js-app-from-dialog')?.addEventListener('click', () => { downloadDialog.close(); setExperience('app'); });

// Marketing tool switcher
$$('[data-marketing-tool]').forEach(button => button.addEventListener('click', () => {
  const tool = button.dataset.marketingTool;
  $$('[data-marketing-tool]').forEach(peer => peer.classList.toggle('active', peer === button));
  $$('[data-marketing-panel]').forEach(panel => {
    const active = panel.dataset.marketingPanel === tool;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
}));

// The marketing demos behave like small, focused slices of the real product.
$('#marketing-add-event').addEventListener('click', () => {
  const day = $('.week-grid .today');
  if ($('.user-event', day)) return showToast('L’événement est déjà dans le calendrier.');
  const event = document.createElement('article');
  event.className = 'event purple user-event selected';
  event.innerHTML = 'Lecture du chapitre 4<small>12:30 · Bibliothèque</small>';
  day.appendChild(event);
  showToast('Événement ajouté au calendrier.');
});

$('.week-grid').addEventListener('click', event => {
  const card = event.target.closest('.event');
  if (!card) return;
  $$('.event', event.currentTarget).forEach(peer => peer.classList.toggle('selected', peer === card));
});

const marketingStudy = $('#marketing-study');
const marketingQuestions = {
  'Psychologie cognitive':['Qu’est-ce que la mémoire de travail ?','Un système cognitif qui maintient temporairement l’information utile à une tâche.'],
  'Méthodes de recherche':['Qu’est-ce qu’un plan intra-sujets ?','Chaque participant est exposé à toutes les conditions expérimentales.'],
  'Sociologie':['Qu’est-ce que la socialisation secondaire ?','L’apprentissage de nouveaux rôles et de nouvelles normes au cours de la vie.']
};
$$('[data-marketing-deck]').forEach(button => button.addEventListener('click', () => {
  const deck = button.dataset.marketingDeck;
  const [question,answer] = marketingQuestions[deck];
  $('#marketing-study-deck').textContent = deck.toUpperCase();
  $('#marketing-study-question').textContent = question;
  $('#marketing-study-answer').textContent = answer;
  $('#marketing-study-answer').hidden = true;
  $('#marketing-study-hint').hidden = false;
  marketingStudy.hidden = false;
}));
marketingStudy.addEventListener('click', event => {
  if (event.target.closest('.marketing-study-close')) return marketingStudy.hidden = true;
  $('#marketing-study-answer').hidden = false;
  $('#marketing-study-hint').hidden = true;
});

const marketingBoard = $('#marketing-board');
function enableMarketingBoardDrag(item) {
  item.addEventListener('pointerdown', event => {
    if (event.target.closest('[contenteditable]') && document.activeElement === item) return;
    const boardRect = marketingBoard.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const originX = itemRect.left - boardRect.left;
    const originY = itemRect.top - boardRect.top;
    const startX = event.clientX;
    const startY = event.clientY;
    item.classList.add('moving');
    const move = pointer => {
      item.style.left = `${Math.max(0,Math.min(boardRect.width-itemRect.width,originX+pointer.clientX-startX))}px`;
      item.style.top = `${Math.max(55,Math.min(boardRect.height-itemRect.height-55,originY+pointer.clientY-startY))}px`;
      item.style.right = 'auto';
      item.style.transform = 'none';
    };
    const end = () => { item.classList.remove('moving'); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',end);
  });
}
$$('.marketing-board-item', marketingBoard).forEach(enableMarketingBoardDrag);
$$('[data-marketing-board-item]').forEach((button,index) => button.addEventListener('click', () => {
  const type = button.dataset.marketingBoardItem;
  const item = document.createElement('article');
  item.contentEditable = 'true';
  item.className = `marketing-board-item ${type === 'note' ? 'sticky-note' : type === 'shape' ? 'board-rect' : 'board-rect'}`;
  item.style.left = `${28 + index * 12}%`;
  item.style.top = `${36 + index * 7}%`;
  item.innerHTML = type === 'note' ? 'Nouvelle note<small>Écrivez votre idée</small>' : type === 'text' ? 'Commencer à écrire…' : 'Nouvelle idée';
  marketingBoard.appendChild(item);
  enableMarketingBoardDrag(item);
  showToast('Élément ajouté au canvas.');
}));
$('#marketing-board-theme').addEventListener('click', event => {
  marketingBoard.classList.toggle('light');
  event.currentTarget.textContent = marketingBoard.classList.contains('light') ? '☾' : '☼';
});
$('#marketing-board-export').addEventListener('click', () => showToast('Canvas prêt à être exporté.'));

$('#marketing-pdf-drop').addEventListener('click', event => {
  const button = event.currentTarget;
  button.classList.add('is-loading');
  button.querySelector('b').textContent = 'Extraction des slides…';
  setTimeout(() => {
    button.classList.remove('is-loading');
    button.querySelector('b').textContent = 'Slides déployées : notes ouvertes à côté';
    showToast('12 slides extraites. Vous pouvez prendre des notes.');
  }, 650);
});

// Marketing export lab: the source, settings and PDF preview stay in sync.
const marketingExportPanel = $('#marketing-export-panel');
const marketingPaper = $('#marketing-paper-output');
const marketingExportName = $('#marketing-export-name');
const marketingExportSources = $$('[data-export-source]');
const marketingExportDefaults = {
  content: Object.fromEntries(marketingExportSources.map(node => [node.dataset.exportSource, node.textContent.trim()])),
  format: 'a4', font: 'serif', size: 'medium',
  options: { numbered:true, subpages:true, 'page-numbers':true, header:true }
};

function updateMarketingOutput(key, value) {
  const cleanValue = value.replace(/\s+/g, ' ').trim();
  $$(`[data-export-output="${key}"]`, marketingPaper).forEach(node => {
    node.textContent = cleanValue || (key === 'title' ? 'Sans titre' : '—');
  });
  if (key === 'title') {
    $('[data-export-output="running-title"]', marketingPaper).textContent = (cleanValue || 'Sans titre').toUpperCase();
  }
}

function syncMarketingTitle(value, origin) {
  const cleanValue = value.replace(/\s+/g, ' ').trim();
  if (origin !== marketingExportName) marketingExportName.value = cleanValue;
  const sourceTitle = $('[data-export-source="title"]');
  if (origin !== sourceTitle) sourceTitle.textContent = cleanValue || 'Sans titre';
  updateMarketingOutput('title', cleanValue);
}

marketingExportSources.forEach(source => {
  source.addEventListener('input', () => {
    const key = source.dataset.exportSource;
    if (key === 'title') syncMarketingTitle(source.textContent, source);
    else updateMarketingOutput(key, source.textContent);
  });
  source.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); source.blur(); }
  });
});

marketingExportName.addEventListener('input', () => syncMarketingTitle(marketingExportName.value, marketingExportName));

function selectMarketingExportSetting(setting, value) {
  $$(`[data-export-setting="${setting}"]`, marketingExportPanel).forEach(button => {
    const selected = button.dataset.value === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  marketingPaper.dataset[setting] = value;
}

$$('[data-export-setting]', marketingExportPanel).forEach(button => button.addEventListener('click', () => {
  selectMarketingExportSetting(button.dataset.exportSetting, button.dataset.value);
}));

function applyMarketingExportOption(option, enabled) {
  if (option === 'numbered') $$('.export-number', marketingPaper).forEach(node => node.hidden = !enabled);
  if (option === 'subpages') $('[data-export-part="subpages"]', marketingPaper).hidden = !enabled;
  if (option === 'page-numbers') $('[data-export-part="page-number"]', marketingPaper).hidden = !enabled;
  if (option === 'header') $('[data-export-part="header"]', marketingPaper).hidden = !enabled;
}

$$('[data-export-option]', marketingExportPanel).forEach(input => input.addEventListener('change', () => {
  applyMarketingExportOption(input.dataset.exportOption, input.checked);
}));

function resetMarketingExport() {
  Object.entries(marketingExportDefaults.content).forEach(([key,value]) => {
    const source = $(`[data-export-source="${key}"]`);
    source.textContent = value;
    updateMarketingOutput(key, value);
  });
  marketingExportName.value = marketingExportDefaults.content.title;
  selectMarketingExportSetting('format', marketingExportDefaults.format);
  selectMarketingExportSetting('font', marketingExportDefaults.font);
  selectMarketingExportSetting('size', marketingExportDefaults.size);
  $$('[data-export-option]', marketingExportPanel).forEach(input => {
    input.checked = marketingExportDefaults.options[input.dataset.exportOption];
    applyMarketingExportOption(input.dataset.exportOption, input.checked);
  });
  showToast('Aperçu réinitialisé.');
}

$('#marketing-export-reset').addEventListener('click', resetMarketingExport);
$('#marketing-export-generate').addEventListener('click', event => {
  const button = event.currentTarget;
  marketingPaper.classList.remove('is-exporting');
  void marketingPaper.offsetWidth;
  marketingPaper.classList.add('is-exporting');
  button.textContent = 'Génération…';
  button.disabled = true;
  setTimeout(() => { button.textContent = 'PDF prêt ✓'; showToast('Le PDF reflète les réglages sélectionnés.'); }, 420);
  setTimeout(() => { button.textContent = 'Exporter'; button.disabled = false; }, 1550);
});

const comparisonData = {
  notion: { name:'Notion', summary:'Folio évite de séparer notes, calendrier et révision.', rows:[['Prise de notes','Blocs natifs','Blocs natifs','positive'],['PDF & slides','Notes à côté de chaque page','Aperçu sans notes par page','limited'],['Flashcards','Intégrées','Application ou modèle externe','limited'],['Calendrier','Intégré','Application séparée','limited'],['Export de cours','PDF académique réglable','PDF standard','limited'],['Données','Locales par défaut','Cloud par défaut','limited']] },
  obsidian: { name:'Obsidian', summary:'Folio garde la souplesse locale avec moins de réglages.', rows:[['Prise de notes','Blocs visuels','Markdown','positive'],['PDF & slides','Notes à côté de chaque page','Extension ou mise en page manuelle','limited'],['Flashcards','Intégrées','Extension','limited'],['Calendrier','Intégré','Extension','limited'],['Export de cours','PDF académique réglable','Extension','limited'],['Données','Locales par défaut','Locales par défaut','positive']] },
  craft: { name:'Craft', summary:'Folio ajoute les outils d’étude et reste gratuit.', rows:[['Prise de notes','Blocs natifs','Blocs natifs','positive'],['PDF & slides','Notes à côté de chaque page','Aperçu','limited'],['Flashcards','Intégrées','Non intégrées','limited'],['Calendrier','Intégré','Intégré','positive'],['Export de cours','PDF académique réglable','PDF','limited'],['Données','Locales par défaut','Mode hors ligne','limited']] },
  remnote: { name:'RemNote', summary:'Folio organise tout le semestre dans une interface plus simple.', rows:[['Prise de notes','Pages et blocs','Outliner','positive'],['PDF & slides','Notes à côté de chaque page','Annotations PDF','positive'],['Flashcards','Intégrées','Intégrées','positive'],['Calendrier','Intégré','Limité','limited'],['Canvas','Intégré','Non intégré','limited'],['Données','Locales par défaut','Selon l’offre','limited']] }
};

function renderComparison(key='notion') {
  const data = comparisonData[key];
  $('#comparison-name').textContent = data.name;
  $('#comparison-summary').textContent = data.summary;
  $('#comparison-rows').innerHTML = data.rows.map(([label,folio,other,status]) => `<div class="comparison-row"><b>${escapeHtml(label)}</b><span class="comparison-cell positive">${escapeHtml(folio)}</span><span class="comparison-cell ${status}">${escapeHtml(other)}</span></div>`).join('');
  $$('[data-compare]').forEach(button => {
    const active = button.dataset.compare === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}
$$('[data-compare]').forEach(button => button.addEventListener('click', () => renderComparison(button.dataset.compare)));
renderComparison();

// The hero is a small slideshow of genuinely different home spaces.
const showcaseSection = $('#showcase');
const showcaseNav = $('.home-showcase-nav');
const homeShowcase = $('#hero-home-showcase');
if (showcaseSection && showcaseNav && homeShowcase) showcaseSection.append(showcaseNav,homeShowcase);
const homeShowcaseSlides = [
  {
    key:'law', caption:'Droit · Genève', location:'Genève · Faculté de droit', primary:'Bachelor en droit', secondary:'Mémoire',
    pages:[
      ['Droit des obligations','Modifié il y a 16 min','cover-archive'],['Droit constitutionnel','Modifié il y a 1 h','cover-library'],['Procédure civile','Modifié hier','cover-stone'],['Droit pénal','Modifié hier','cover-ink'],
      ['Question de recherche','Modifié vendredi','cover-wave'],['Bibliographie','Modifié vendredi','cover-grid'],['Plan du mémoire','Modifié jeudi','cover-paper']
    ]
  },
  {
    key:'architecture', caption:'Architecture · Lausanne', location:'Lausanne · Atelier d’architecture', primary:'Atelier semestre', secondary:'Projet de studio',
    pages:[
      ['Habitat collectif','Modifié à l’instant','cover-concrete'],['Structures','Modifié il y a 24 min','cover-blueprint'],['Histoire de la ville','Modifié hier','cover-city'],['Représentation','Modifié hier','cover-model'],
      ['Site et contexte','Modifié vendredi','cover-topography'],['Matériaux','Modifié vendredi','cover-copper'],['Présentation finale','Modifié jeudi','cover-gallery']
    ]
  },
  {
    key:'medicine', caption:'Médecine · Bâle', location:'Bâle · Faculté de médecine', primary:'Semestre clinique', secondary:'Recherche',
    pages:[
      ['Anatomie','Modifié il y a 8 min','cover-anatomy'],['Physiologie','Modifié il y a 42 min','cover-cells'],['Pharmacologie','Modifié hier','cover-molecule'],['Sémiologie','Modifié hier','cover-clinic'],
      ['Lecture critique','Modifié vendredi','cover-microscope'],['Protocole','Modifié vendredi','cover-data'],['Poster scientifique','Modifié jeudi','cover-poster']
    ]
  }
];
let homeSlideIndex = 0;
let homeSlideTimer;

function renderHomeShowcase(key) {
  const slideIndex = homeShowcaseSlides.findIndex(slide => slide.key === key);
  if (slideIndex < 0 || !homeShowcase) return;
  homeSlideIndex = slideIndex;
  const slide = homeShowcaseSlides[slideIndex];
  homeShowcase.classList.add('is-changing');
  clearTimeout(renderHomeShowcase.timer);
  renderHomeShowcase.timer = setTimeout(() => homeShowcase.classList.remove('is-changing'),240);
  homeShowcase.dataset.homeShowcase = slide.key;
  $('#home-showcase-caption').textContent = slide.caption;
  $('#hero-location').textContent = slide.location;
  $('#hero-primary-folder').textContent = slide.primary;
  $('#hero-secondary-folder').textContent = slide.secondary;
  $$('[data-hero-page]',homeShowcase).forEach((card,index) => {
    const page = slide.pages[index];
    if (!page) return;
    $('b',card).textContent = page[0];
    $('small',card).textContent = page[1];
    $('.cover',card).className = `cover ${page[2]}`;
  });
  $$('[data-home-slide]').forEach(button => {
    const active = button.dataset.homeSlide === slide.key;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
}

function startHomeShowcase() {
  clearInterval(homeSlideTimer);
  homeSlideTimer = setInterval(() => renderHomeShowcase(homeShowcaseSlides[(homeSlideIndex + 1) % homeShowcaseSlides.length].key),2800);
}
$$('[data-home-slide]').forEach(button => button.addEventListener('click', () => { renderHomeShowcase(button.dataset.homeSlide); startHomeShowcase(); }));
homeShowcase?.addEventListener('mouseenter', () => clearInterval(homeSlideTimer));
homeShowcase?.addEventListener('mouseleave', startHomeShowcase);
homeShowcase?.addEventListener('focusin', () => clearInterval(homeSlideTimer));
homeShowcase?.addEventListener('focusout', event => { if (!homeShowcase.contains(event.relatedTarget)) startHomeShowcase(); });
renderHomeShowcase('law');
startHomeShowcase();

const originDemo = $('.origin-demo');
const originMenu = $('#origin-menu');
const originCommand = $('#origin-command');
const originResult = $('#origin-result');
const originRows = $$('[data-origin-row]');
const originMessages = ['Une page vide.','Écrivez librement.','Ajoutez une sous-page.','Structurez votre cours.','Transformez une idée.','Tout commence par un bloc.'];
let originPhase = 0;
let originTimer;

function renderOriginDemo(phase) {
  originPhase = phase % originMessages.length;
  const menuOpen = originPhase !== 0;
  const activeIndex = originPhase === 5 ? 0 : Math.max(0,originPhase - 1);
  originCommand.textContent = menuOpen ? '/' : '';
  originMenu.classList.toggle('is-hidden',!menuOpen);
  originRows.forEach((row,index) => row.classList.toggle('active',menuOpen && index === activeIndex));
  originResult.textContent = originMessages[originPhase];
}

function startOriginDemo() {
  clearInterval(originTimer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { renderOriginDemo(1); return; }
  originTimer = setInterval(() => renderOriginDemo(originPhase + 1),650);
}

originRows.forEach((row,index) => row.addEventListener('click', () => {
  clearInterval(originTimer);
  renderOriginDemo(index + 1);
  setTimeout(startOriginDemo,900);
}));
originDemo?.addEventListener('mouseenter', () => clearInterval(originTimer));
originDemo?.addEventListener('mouseleave', startOriginDemo);
renderOriginDemo(0);
startOriginDemo();

function updateClockHands(now = new Date()) {
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  $$('.clock-mock').forEach(clock => {
    $('.hour-hand',clock).style.transform = `translateX(-50%) rotate(${hours * 30}deg)`;
    $('.minute-hand',clock).style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`;
    $('.second-hand',clock).style.transform = `translateX(-50%) rotate(${seconds * 6}deg)`;
  });
}

function updateClockDate(now = new Date()) {
  const date = new Intl.DateTimeFormat('fr-CH',{ weekday:'long', day:'numeric', month:'long' }).format(now);
  if ($('#app-current-date')) $('#app-current-date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

function animateClocks() {
  updateClockHands();
  requestAnimationFrame(animateClocks);
}

updateClockDate();
setInterval(updateClockDate, 60000);
requestAnimationFrame(animateClocks);

const revealNodes = $$('.section-copy, .product-frame, .export-layout, .comparison-wrap, .free-layout, .final-section');
revealNodes.forEach(node => node.classList.add('reveal-node'));
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver.unobserve(entry.target); }
}), { threshold: .1 });
revealNodes.forEach(node => revealObserver.observe(node));

// Keep the navigation useful while scrolling, without adding a progress bar.
const marketingNavLinks = $$('.site-nav a[href^="#"]');
const marketingSections = marketingNavLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const navigationObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    marketingNavLinks.forEach(link => {
      const current = link.getAttribute('href') === `#${visible.target.id}`;
      link.classList.toggle('is-current',current);
      if (current) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
    });
  }, { rootMargin:'-24% 0px -58% 0px', threshold:[0,.08,.25,.5] });
  marketingSections.forEach(section => navigationObserver.observe(section));
}

const siteHeader = $('.site-header');
const updateMarketingHeader = () => siteHeader.classList.toggle('is-scrolled',window.scrollY > 34 && !document.body.classList.contains('app-open'));
window.addEventListener('scroll',updateMarketingHeader,{passive:true});
updateMarketingHeader();

// App routing
function openRoute(route) {
  currentRoute = route;
  $$('[data-app-view]').forEach(view => {
    const active = view.dataset.appView === route;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  $$('[data-app-route]').forEach(button => button.classList.toggle('active', button.dataset.appRoute === route));
  if (route === 'home') renderHomePages();
  if (route === 'all') renderAllNotes();
  if (route === 'editor') renderCurrentPage();
  if (route === 'anki') renderStudy();
  closeFloatingUI();
  if (window.innerWidth <= 720) sidebar.classList.remove('mobile-open');
}

$$('[data-app-route]').forEach(button => button.addEventListener('click', () => openRoute(button.dataset.appRoute)));
$$('[data-app-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.appToast)));

function currentPage() { return state.pages.find(page => page.id === currentPageId) || state.pages[0]; }

function renderNavigation() {
  const list = $('#app-page-list');
  list.innerHTML = '';
  state.pages.forEach(page => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = currentRoute === 'editor' && page.id === currentPageId ? 'active' : '';
    button.innerHTML = `<svg><use href="#i-file"/></svg><span>${escapeHtml(page.title)}</span>`;
    button.addEventListener('click', () => openPage(page.id));
    list.appendChild(button);
  });
  $('#app-due-count').textContent = String(12 + Math.max(0, state.cards.length - studyCards.length));
  renderCommandPages();
}

function pageCard(page) {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<i class="cover ${escapeHtml(page.cover)} customizable-cover" tabindex="0" aria-label="Changer l’image de ${escapeHtml(page.title)}"></i><b>${escapeHtml(page.title)}</b><small>${escapeHtml(page.edited)}</small>`;
  const cover = $('.cover',button);
  if (page.coverImage) cover.style.backgroundImage = `url("${page.coverImage}")`;
  const customize = event => {
    event.preventDefault();
    event.stopPropagation();
    openImagePicker({ type:'page', id:page.id });
  };
  cover.addEventListener('click', customize);
  cover.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') customize(event); });
  button.addEventListener('click', () => openPage(page.id));
  return button;
}

function renderHomePages() {
  const grid = $('#app-home-pages');
  grid.innerHTML = '';
  state.pages.filter(page => page.project === 'Semestre 1').slice(0,4).forEach(page => grid.appendChild(pageCard(page)));
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'create-page-card';
  create.innerHTML = '＋<small>Nouvelle page</small>';
  create.addEventListener('click', createPage);
  grid.appendChild(create);
}

function renderAllNotes() {
  const grid = $('#all-notes-grid');
  grid.innerHTML = '';
  state.pages.forEach(page => grid.appendChild(pageCard(page)));
}

function openPage(id) {
  if (!state.pages.some(page => page.id === id)) return;
  currentPageId = id;
  openRoute('editor');
  renderNavigation();
}

function createPage() {
  const page = { id:uid('page'), title:'Sans titre', subtitle:'Nouvelle page', project:'Semestre 1', edited:'À l’instant', cover:'cover-steel', blocks:[newBlock('paragraph')] };
  state.pages.unshift(page);
  currentPageId = page.id;
  saveState();
  renderNavigation();
  renderHomePages();
  renderAllNotes();
  openRoute('editor');
  requestAnimationFrame(() => $('#app-title').select());
}

['#new-page-main','#new-page-mini','#all-new-page'].forEach(selector => $(selector).addEventListener('click', createPage));
$('#new-project').addEventListener('click', () => showToast('Nouveau projet créé.'));
$$('.create-page-card').forEach(button => button.addEventListener('click', createPage));

function toggleSidebar() {
  if (window.innerWidth <= 720) sidebar.classList.toggle('mobile-open');
  else webShell.classList.toggle('sidebar-closed');
}
$('#app-sidebar-toggle').addEventListener('click', toggleSidebar);
$$('.inline-sidebar-toggle').forEach(button => button.addEventListener('click', toggleSidebar));

// Editor
function renderCurrentPage() {
  const page = currentPage();
  if (!page) return;
  $('#app-breadcrumb').textContent = `${page.project} / ${page.title}`;
  $('#app-title').value = page.title;
  $('#app-page-subtitle').textContent = page.subtitle;
  renderBlocks();
  updateWordCount();
}

function newBlock(type, html = '') {
  const block = { id:uid('block'), type, html };
  if (type === 'todo') block.checked = false;
  if (type === 'table') block.cells = [['Concept','Définition'],['Mémoire de travail','Espace cognitif temporaire']];
  if (type === 'columns2' || type === 'columns3') {
    const count = type === 'columns2' ? 2 : 3;
    block.columns = Array.from({length:count}, (_,index) => index === 0
      ? [newColumnItem('heading3','Idée principale'),newColumnItem('paragraph','Glissez un bloc de la page dans cette colonne.')]
      : [newColumnItem('heading3',index === 1 ? 'À retenir' : 'Références')]);
  }
  return block;
}

function newColumnItem(type = 'paragraph', html = '') {
  const item = { id:uid('column'), type, html };
  if (type === 'todo') item.checked = false;
  return item;
}

function normalizeColumns(block,count) {
  if (!Array.isArray(block.columns)) block.columns = Array.from({length:count}, () => []);
  while (block.columns.length < count) block.columns.push([]);
  block.columns = block.columns.slice(0,count);
  block.columns.forEach(column => column.forEach(item => { if (!item.id) item.id = uid('column'); }));
  if (!Array.isArray(block.columnFractions) || block.columnFractions.length !== count) block.columnFractions = Array.from({length:count}, () => 1 / count);
}

function renderBlocks() {
  const editor = $('#app-block-editor');
  editor.innerHTML = '';
  currentPage().blocks.forEach((block,index) => editor.appendChild(makeBlockElement(block,index)));
}

function makeBlockElement(block,index) {
  const row = document.createElement('div');
  row.className = 'app-block';
  row.dataset.blockId = block.id;
  row.dataset.type = block.type;
  row.innerHTML = '<div class="block-controls"><button class="block-plus" type="button">＋</button><button class="block-grip" type="button">⠿</button></div>';
  const body = document.createElement('div');
  body.className = 'block-body';

  if (block.type === 'divider') {
    body.innerHTML = '<hr />';
  } else if (block.type === 'table') {
    const table = document.createElement('table');
    (block.cells || [['Concept','Définition'],['Valeur','Valeur']]).forEach((cells,rowIndex) => {
      const tr = document.createElement('tr');
      cells.forEach((cell,cellIndex) => {
        const node = document.createElement(rowIndex === 0 ? 'th' : 'td');
        node.contentEditable = 'true';
        node.textContent = cell;
        node.addEventListener('input', () => { block.cells[rowIndex][cellIndex] = node.textContent; commitPage(); });
        tr.appendChild(node);
      });
      table.appendChild(tr);
    });
    body.appendChild(table);
  } else if (block.type === 'image') {
    body.innerHTML = '<div class="media-block"><svg><use href="#i-image"/></svg><span>Déposer une image ou cliquer pour importer</span></div>';
  } else if (block.type === 'pdf') {
    body.innerHTML = '<div class="pdf-block"><b>PDF</b><span>Article scientifique.pdf</span></div>';
  } else if (block.type === 'columns2' || block.type === 'columns3') {
    body.appendChild(makeColumnsElement(block));
  } else if (block.type === 'page') {
    body.innerHTML = `<div class="subpage-block"><svg><use href="#i-file"/></svg><b contenteditable="true">${escapeHtml(plain(block.html) || 'Sous-page sans titre')}</b><span>→</span></div>`;
  } else if (block.type === 'breadcrumb') {
    body.innerHTML = `<div class="breadcrumb-block">${escapeHtml(currentPage().project)} &nbsp;/&nbsp; ${escapeHtml(currentPage().title)}</div>`;
  } else {
    if (block.type === 'todo') {
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'todo-input';
      check.checked = Boolean(block.checked);
      check.addEventListener('change', () => { block.checked = check.checked; row.classList.toggle('checked',check.checked); commitPage(); });
      body.appendChild(check);
      row.classList.toggle('checked',Boolean(block.checked));
    }
    if (block.type === 'bullet') body.insertAdjacentHTML('beforeend','<span class="block-prefix">•</span>');
    if (block.type === 'numbered') body.insertAdjacentHTML('beforeend',`<span class="block-prefix">${index + 1}.</span>`);
    if (block.type === 'quote') body.insertAdjacentHTML('beforeend','<span class="quote-line"></span>');
    const tag = ['heading1','heading2','heading3'].includes(block.type) ? `h${block.type.slice(-1)}` : 'div';
    const editable = document.createElement(tag);
    editable.className = 'block-content';
    editable.contentEditable = 'true';
    editable.spellcheck = true;
    editable.dataset.placeholder = placeholder(block.type);
    editable.innerHTML = block.html || '';
    editable.addEventListener('focus', () => activeBlockId = block.id);
    editable.addEventListener('input', () => {
      block.html = editable.innerHTML;
      if (plain(block.html).startsWith('/')) showSlash(row,block.id,editable); else slashMenu.hidden = true;
      commitPage();
    });
    editable.addEventListener('keydown', event => blockKeydown(event,block));
    body.appendChild(editable);
  }

  row.appendChild(body);
  $('.block-plus',row).addEventListener('click', event => {
    const created = insertAfter(block.id,'paragraph');
    renderBlocks();
    const newRow = $(`[data-block-id="${created.id}"]`);
    showSlash(newRow,created.id,event.currentTarget);
    focusBlock(created.id);
  });
  const grip = $('.block-grip',row);
  grip.addEventListener('click', event => { if (!pointerDragClickGuard) showBlockMenu(row,block.id,event.currentTarget); });
  enablePointerBlockDrag(grip,row,{ kind:'block', id:block.id });
  grip.addEventListener('dragstart', event => { draggedBlockId = block.id; draggedColumnItem = null; row.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain',block.id); });
  grip.addEventListener('dragend', () => { draggedBlockId = null; row.classList.remove('dragging'); });
  row.addEventListener('dragover', event => { event.preventDefault(); row.classList.add('drag-over'); });
  row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
  row.addEventListener('drop', event => {
    event.preventDefault();
    row.classList.remove('drag-over');
    if (draggedColumnItem) moveColumnItemToPage(draggedColumnItem,block.id);
    else reorderBlock(draggedBlockId || event.dataTransfer.getData('text/plain'),block.id);
  });
  return row;
}

function makeColumnsElement(block) {
  const count = block.type === 'columns2' ? 2 : 3;
  normalizeColumns(block,count);
  const shell = document.createElement('section');
  shell.className = 'columns-shell';
  shell.dataset.columnContainer = block.id;
  const grid = document.createElement('div');
  grid.className = 'columns-block';
  const applyFractions = () => { grid.style.gridTemplateColumns = block.columnFractions.map((fraction,index) => `${fraction}fr${index < count - 1 ? ' 12px' : ''}`).join(' '); };
  applyFractions();
  block.columns.forEach((column,columnIndex) => {
    const zone = document.createElement('div');
    zone.className = 'column-dropzone';
    zone.dataset.columnIndex = String(columnIndex);
    zone.dataset.columnContainer = block.id;
    const items = document.createElement('div');
    items.className = 'column-items';
    if (!column.length) {
      const empty = document.createElement('p');
      empty.className = 'column-empty';
      empty.textContent = 'Cliquer pour écrire';
      items.appendChild(empty);
    }
    column.forEach((item,itemIndex) => items.appendChild(makeColumnItemElement(item,block,columnIndex,itemIndex)));
    zone.appendChild(items);
    const add = document.createElement('button');
    add.className = 'column-add';
    add.type = 'button';
    add.textContent = '＋';
    add.setAttribute('aria-label',`Ajouter un bloc dans la colonne ${columnIndex + 1}`);
    add.addEventListener('click', () => { column.push(newColumnItem()); commitPage(); renderBlocks(); requestAnimationFrame(() => $(`[data-block-id="${block.id}"] [data-column-index="${columnIndex}"] .column-item:last-of-type .column-content`)?.focus()); });
    zone.appendChild(add);
    if (!column.length) zone.addEventListener('click', event => { if (!event.target.closest('button')) add.click(); });
    zone.addEventListener('dragover', event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; zone.classList.add('is-target'); });
    zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-target'); });
    zone.addEventListener('drop', event => {
      event.preventDefault(); event.stopPropagation(); zone.classList.remove('is-target');
      if (draggedColumnItem) moveColumnItemToColumn(draggedColumnItem,block.id,columnIndex);
      else moveBlockToColumn(draggedBlockId || event.dataTransfer.getData('text/plain'),block.id,columnIndex);
    });
    grid.appendChild(zone);
    if (columnIndex < count - 1) grid.appendChild(makeColumnResizeHandle(block,columnIndex,grid,applyFractions));
  });
  shell.appendChild(grid);
  return shell;
}

function makeColumnResizeHandle(block,index,grid,applyFractions) {
  const handle = document.createElement('div');
  handle.className = 'column-resize-handle';
  handle.tabIndex = 0;
  handle.setAttribute('role','separator');
  handle.setAttribute('aria-orientation','vertical');
  handle.setAttribute('aria-label',`Redimensionner les colonnes ${index + 1} et ${index + 2}`);
  const adjust = delta => {
    const total = block.columnFractions[index] + block.columnFractions[index + 1];
    const minimum = Math.min(.18,total / 3);
    const left = Math.max(minimum,Math.min(total - minimum,block.columnFractions[index] + delta));
    block.columnFractions[index] = left;
    block.columnFractions[index + 1] = total - left;
    applyFractions();
    handle.setAttribute('aria-valuenow',String(Math.round(left / total * 100)));
  };
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); adjust(event.key === 'ArrowLeft' ? -.03 : .03); commitPage();
  });
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const startX = event.clientX;
    const start = [...block.columnFractions];
    const available = Math.max(100,grid.getBoundingClientRect().width - 12 * (block.columnFractions.length - 1));
    handle.classList.add('resizing');
    const move = pointer => {
      block.columnFractions = [...start];
      adjust((pointer.clientX - startX) / available);
    };
    const end = () => {
      handle.classList.remove('resizing');
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',end);
      commitPage();
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',end,{once:true});
  });
  return handle;
}

function makeColumnItemElement(item,container,columnIndex,itemIndex) {
  const row = document.createElement('article');
  row.className = 'column-item';
  row.dataset.columnItem = item.id;
  row.dataset.type = item.type;
  const contentBody = document.createElement('div');
  contentBody.className = 'column-item-body';
  const grip = document.createElement('button');
  grip.className = 'column-grip';
  grip.type = 'button';
  grip.textContent = '⠿';
  grip.setAttribute('aria-label','Déplacer ce bloc');
  grip.addEventListener('dragstart', event => {
    draggedColumnItem = { containerId:container.id, columnIndex, itemId:item.id };
    draggedBlockId = null;
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain',item.id);
  });
  grip.addEventListener('dragend', () => { draggedColumnItem = null; row.classList.remove('dragging'); $$('.column-dropzone').forEach(zone => zone.classList.remove('is-target')); });
  enablePointerBlockDrag(grip,row,{ kind:'column', reference:{ containerId:container.id, columnIndex, itemId:item.id } });
  row.appendChild(grip);
  if (item.type === 'todo') {
    const check = document.createElement('input');
    check.type = 'checkbox'; check.className = 'todo-input'; check.checked = Boolean(item.checked);
    check.addEventListener('change', () => { item.checked = check.checked; row.classList.toggle('checked',check.checked); commitPage(); });
    row.classList.toggle('checked',Boolean(item.checked));
    contentBody.appendChild(check);
  }
  if (item.type === 'bullet') contentBody.insertAdjacentHTML('beforeend','<span class="column-prefix">•</span>');
  if (item.type === 'numbered') contentBody.insertAdjacentHTML('beforeend',`<span class="column-prefix">${itemIndex + 1}.</span>`);
  if (item.type === 'image' || item.type === 'pdf' || item.type === 'table') {
    const chip = document.createElement('div');
    chip.className = 'column-media-chip';
    chip.textContent = item.type === 'image' ? '▧ Image' : item.type === 'pdf' ? 'PDF · Document' : '▦ Tableau';
    contentBody.appendChild(chip);
    row.appendChild(contentBody);
    return row;
  }
  const tag = ['heading1','heading2','heading3'].includes(item.type) ? `h${item.type.slice(-1)}` : 'div';
  const editable = document.createElement(tag);
  editable.className = 'column-content'; editable.contentEditable = 'true'; editable.spellcheck = true;
  editable.dataset.placeholder = 'Écrire…'; editable.innerHTML = item.html || '';
  editable.addEventListener('input', () => { item.html = editable.innerHTML; commitPage(); });
  contentBody.appendChild(editable);
  row.appendChild(contentBody);
  return row;
}

function enablePointerBlockDrag(handle,preview,source) {
  handle.addEventListener('pointerdown', startEvent => {
    if (startEvent.button !== 0) return;
    const start = { x:startEvent.clientX, y:startEvent.clientY };
    let moved = false;
    const clearTargets = () => { $$('.column-dropzone').forEach(zone => zone.classList.remove('is-target')); $$('.app-block').forEach(block => block.classList.remove('drag-over')); };
    const findTarget = event => document.elementsFromPoint(event.clientX,event.clientY).find(node => node.closest?.('.column-dropzone,.app-block'))?.closest('.column-dropzone,.app-block');
    const move = event => {
      if (!moved && Math.hypot(event.clientX-start.x,event.clientY-start.y) < 6) return;
      moved = true;
      event.preventDefault();
      document.body.classList.add('pointer-block-dragging');
      preview.classList.add('dragging');
      clearTargets();
      const target = findTarget(event);
      if (target?.classList.contains('column-dropzone')) target.classList.add('is-target');
      else target?.classList.add('drag-over');
    };
    const end = event => {
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',end);
      document.body.classList.remove('pointer-block-dragging');
      preview.classList.remove('dragging');
      const target = moved ? findTarget(event) : null;
      clearTargets();
      if (!moved || !target) return;
      pointerDragClickGuard = true;
      setTimeout(() => pointerDragClickGuard = false,0);
      if (target.classList.contains('column-dropzone')) {
        const containerId = target.dataset.columnContainer;
        const columnIndex = Number(target.dataset.columnIndex);
        if (source.kind === 'column') moveColumnItemToColumn(source.reference,containerId,columnIndex);
        else moveBlockToColumn(source.id,containerId,columnIndex);
        return;
      }
      const targetId = target.dataset.blockId;
      if (source.kind === 'column') moveColumnItemToPage(source.reference,targetId);
      else reorderBlock(source.id,targetId);
    };
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',end,{once:true});
  });
}

function placeholder(type) {
  return ({ paragraph:"Écrire '/' pour les commandes", heading1:'Titre 1', heading2:'Titre 2', heading3:'Titre 3', bullet:'Élément de liste', numbered:'Élément de liste', todo:'Tâche', quote:'Citation' })[type] || 'Écrire…';
}

function commitPage() {
  currentPage().edited = 'À l’instant';
  saveState();
  updateWordCount();
}

function updateWordCount() {
  const count = currentPage().blocks.reduce((sum,block) => {
    const nested = (block.columns || []).flat().reduce((columnSum,item) => columnSum + plain(item.html).split(/\s+/).filter(Boolean).length,0);
    return sum + plain(block.html).split(/\s+/).filter(Boolean).length + nested;
  },0);
  $('#app-word-count').textContent = `${count} mot${count > 1 ? 's' : ''}`;
}

function insertAfter(id,type,html='') {
  const page = currentPage();
  const index = page.blocks.findIndex(block => block.id === id);
  const block = newBlock(type,html);
  page.blocks.splice(index < 0 ? page.blocks.length : index + 1,0,block);
  commitPage();
  return block;
}

function focusBlock(id) { requestAnimationFrame(() => $('.block-content',$(`[data-block-id="${id}"]`))?.focus()); }

function blockKeydown(event,block) {
  const text = plain(event.currentTarget.innerHTML);
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const nextType = ['bullet','numbered','todo'].includes(block.type) ? block.type : 'paragraph';
    const created = insertAfter(block.id,nextType);
    renderBlocks();
    focusBlock(created.id);
  }
  if (event.key === 'Backspace' && !text && currentPage().blocks.length > 1) {
    event.preventDefault();
    const page = currentPage();
    const index = page.blocks.findIndex(item => item.id === block.id);
    const previous = page.blocks[Math.max(0,index - 1)];
    page.blocks.splice(index,1);
    commitPage(); renderBlocks(); focusBlock(previous.id);
  }
  const markdown = { '#':'heading1','##':'heading2','###':'heading3','-':'bullet','*':'bullet','1.':'numbered','>':'quote','[]':'todo','[ ]':'todo' };
  if (event.key === ' ' && markdown[text]) {
    event.preventDefault();
    block.type = markdown[text]; block.html = '';
    renderBlocks(); focusBlock(block.id);
  }
}

function placeMenu(menu,anchor,width,height=400) {
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.max(10,Math.min(innerWidth - width - 10,rect.left))}px`;
  menu.style.top = `${Math.max(76,Math.min(innerHeight - height - 10,rect.bottom + 6))}px`;
  menu.hidden = false;
}
function showSlash(row,id,anchor=row) { activeBlockId = id; blockMenu.hidden = true; placeMenu(slashMenu,anchor,310,440); }
function showBlockMenu(row,id,anchor=row) { activeBlockId = id; slashMenu.hidden = true; placeMenu(blockMenu,anchor,225,330); }
function closeFloatingUI() { slashMenu.hidden = true; blockMenu.hidden = true; commandPalette.hidden = true; }

$$('[data-slash]').forEach(button => button.addEventListener('click', () => transformBlock(activeBlockId,button.dataset.slash,true)));
$$('[data-turn]').forEach(button => button.addEventListener('click', () => transformBlock(activeBlockId,button.dataset.turn)));

function transformBlock(id,type,clearSlash=false) {
  const block = currentPage().blocks.find(item => item.id === id);
  if (!block) return;
  const previousType = block.type;
  const previousHtml = block.html;
  block.type = type;
  if (clearSlash && plain(block.html).startsWith('/')) block.html = '';
  if (type === 'todo') block.checked = Boolean(block.checked);
  if (type === 'table' && !block.cells) block.cells = [['Concept','Définition'],['Mémoire de travail','Espace cognitif temporaire']];
  if (type === 'columns2' || type === 'columns3') {
    const count = type === 'columns2' ? 2 : 3;
    if (!Array.isArray(block.columns)) {
      block.columns = Array.from({length:count}, () => []);
      if (previousHtml && !plain(previousHtml).startsWith('/')) block.columns[0].push(newColumnItem(previousType,previousHtml));
      else {
        block.columns[0].push(newColumnItem('heading3','Idée principale'),newColumnItem('paragraph','Glissez un bloc de la page dans cette colonne.'));
        block.columns[1].push(newColumnItem('heading3','À retenir'));
      }
    }
    normalizeColumns(block,count);
    block.html = '';
  }
  commitPage(); renderBlocks(); closeFloatingUI(); focusBlock(id);
}

function findColumnContainer(id) { return currentPage().blocks.find(block => block.id === id && Array.isArray(block.columns)); }

function takeColumnItem(reference) {
  const container = findColumnContainer(reference?.containerId);
  const column = container?.columns?.[reference.columnIndex];
  const index = column?.findIndex(item => item.id === reference.itemId) ?? -1;
  if (!container || !column || index < 0) return null;
  return column.splice(index,1)[0];
}

function moveBlockToColumn(sourceId,containerId,columnIndex) {
  if (!sourceId || sourceId === containerId) return;
  const page = currentPage();
  const sourceIndex = page.blocks.findIndex(item => item.id === sourceId);
  const container = findColumnContainer(containerId);
  if (sourceIndex < 0 || !container?.columns?.[columnIndex]) return;
  const source = page.blocks[sourceIndex];
  if (source.type === 'columns2' || source.type === 'columns3') { showToast('Une colonne ne peut pas être déposée dans elle-même.'); return; }
  page.blocks.splice(sourceIndex,1);
  container.columns[columnIndex].push(source);
  draggedBlockId = null;
  commitPage(); renderBlocks(); showToast('Bloc ajouté à la colonne.');
}

function moveColumnItemToColumn(reference,containerId,columnIndex) {
  if (!reference || !findColumnContainer(containerId)?.columns?.[columnIndex]) return;
  const item = takeColumnItem(reference);
  if (!item) return;
  findColumnContainer(containerId).columns[columnIndex].push(item);
  draggedColumnItem = null;
  commitPage(); renderBlocks(); showToast('Bloc déplacé entre les colonnes.');
}

function moveColumnItemToPage(reference,targetId) {
  const item = takeColumnItem(reference);
  if (!item) return;
  const blocks = currentPage().blocks;
  const targetIndex = blocks.findIndex(block => block.id === targetId);
  blocks.splice(targetIndex < 0 ? blocks.length : targetIndex,0,item);
  draggedColumnItem = null;
  commitPage(); renderBlocks(); showToast('Bloc replacé dans la page.');
}

function reorderBlock(source,target) {
  if (!source || source === target) return;
  const blocks = currentPage().blocks;
  const from = blocks.findIndex(block => block.id === source);
  const to = blocks.findIndex(block => block.id === target);
  if (from < 0 || to < 0) return;
  const [moved] = blocks.splice(from,1);
  blocks.splice(to,0,moved);
  commitPage(); renderBlocks(); showToast('Bloc déplacé.');
}

$('#duplicate-block').addEventListener('click', () => {
  const blocks = currentPage().blocks;
  const index = blocks.findIndex(block => block.id === activeBlockId);
  if (index < 0) return;
  const copy = clone(blocks[index]); copy.id = uid('block'); blocks.splice(index + 1,0,copy);
  commitPage(); renderBlocks(); closeFloatingUI(); showToast('Bloc dupliqué.');
});
$('#delete-block').addEventListener('click', () => {
  const page = currentPage(); page.blocks = page.blocks.filter(block => block.id !== activeBlockId);
  if (!page.blocks.length) page.blocks.push(newBlock('paragraph'));
  commitPage(); renderBlocks(); closeFloatingUI();
});
$('#block-anki').addEventListener('click', () => {
  const block = currentPage().blocks.find(item => item.id === activeBlockId);
  if (!block) return;
  state.cards.push({ deck:currentPage().project.toUpperCase(), question:plain(block.html) || `Réviser ${currentPage().title}`, answer:`Carte liée à la page « ${currentPage().title} ».` });
  saveState(); renderNavigation(); closeFloatingUI(); showToast('Bloc ajouté aux flashcards.');
});

$$('[data-new-block]').forEach(button => button.addEventListener('click', () => {
  const base = activeBlockId || currentPage().blocks.at(-1)?.id;
  const created = insertAfter(base,button.dataset.newBlock);
  renderBlocks(); focusBlock(created.id);
}));
$$('[data-format]').forEach(button => button.addEventListener('click', () => {
  const content = $('.block-content',$(`[data-block-id="${activeBlockId}"]`));
  if (!content) return;
  content.focus();
  const command = button.dataset.format === 'highlight' ? 'backColor' : button.dataset.format;
  document.execCommand(command,false,command === 'backColor' ? '#635b35' : null);
  const block = currentPage().blocks.find(item => item.id === activeBlockId);
  block.html = content.innerHTML; commitPage();
}));

$('#app-title').addEventListener('input', event => {
  currentPage().title = event.target.value || 'Sans titre';
  $('#app-breadcrumb').textContent = `${currentPage().project} / ${currentPage().title}`;
  commitPage(); renderNavigation(); renderHomePages(); renderAllNotes();
});
$('#app-lock').addEventListener('click', event => {
  const locked = webShell.classList.toggle('page-locked');
  event.currentTarget.classList.toggle('active',locked);
  $$('.block-content,[contenteditable]',$('#app-block-editor')).forEach(node => node.contentEditable = String(!locked));
  $('#app-title').disabled = locked;
  showToast(locked ? 'Page verrouillée.' : 'Page déverrouillée.');
});
$('#app-font').addEventListener('click', () => {
  webShell.classList.remove('page-serif','page-mono');
  pageFontIndex = (pageFontIndex + 1) % 3;
  if (pageFontIndex === 1) webShell.classList.add('page-serif');
  if (pageFontIndex === 2) webShell.classList.add('page-mono');
  showToast(['Police par défaut','Police serif','Police monospace'][pageFontIndex]);
});
$('#app-focus').addEventListener('click', () => webShell.classList.toggle('focus-mode'));
$('#app-inspector-toggle').addEventListener('click', () => $('#app-inspector').hidden = !$('#app-inspector').hidden);
$('#app-inspector-close').addEventListener('click', () => $('#app-inspector').hidden = true);

// Command palette
function renderCommandPages(filter='') {
  const list = $('#command-page-results');
  list.innerHTML = '';
  const needle = filter.toLowerCase();
  state.pages.filter(page => page.title.toLowerCase().includes(needle)).forEach(page => {
    const button = document.createElement('button'); button.type = 'button';
    button.innerHTML = `<svg><use href="#i-file"/></svg><span><b>${escapeHtml(page.title)}</b><i>${escapeHtml(page.project)}</i></span>`;
    button.addEventListener('click', () => { commandPalette.hidden = true; openPage(page.id); });
    list.appendChild(button);
  });
}
function openCommand() { renderCommandPages(); commandPalette.hidden = false; requestAnimationFrame(() => $('#command-search').focus()); }
$('#app-search').addEventListener('click',openCommand);
$('#command-search').addEventListener('input',event => renderCommandPages(event.target.value));
commandPalette.addEventListener('click',event => { if (event.target === commandPalette) commandPalette.hidden = true; });
$$('[data-command]').forEach(button => button.addEventListener('click', () => {
  commandPalette.hidden = true;
  if (button.dataset.command === 'new') createPage();
  if (button.dataset.command === 'focus') { if (currentRoute !== 'editor') openPage(currentPageId); webShell.classList.toggle('focus-mode'); }
}));

// Calendar
$('#plan-day').addEventListener('click', () => openRoute('calendar'));
$('#app-new-event').addEventListener('click', () => {
  const day = $('.app-week-grid .today');
  if ($('.user-event',day)) return showToast('L’événement est déjà ajouté.');
  const event = document.createElement('article'); event.className = 'cal-event rose user-event'; event.style.cssText='--y:505px;--h:75px'; event.innerHTML='Réviser le chapitre 4<small>17:00 · 30 min</small>'; day.appendChild(event);
  state.events.push({title:'Réviser le chapitre 4',time:'17:00'}); saveState(); showToast('Événement ajouté.');
});

// Anki
function renderStudy() {
  const card = state.cards[studyIndex % state.cards.length];
  if (!card) return;
  $('#study-count').textContent = `${studyIndex + 1} / ${state.cards.length}`;
  $('#study-progress').style.width = `${((studyIndex + 1)/state.cards.length)*100}%`;
  $('#study-deck-name').textContent = card.deck;
  $('#study-question').textContent = card.question;
  $('#study-answer p').textContent = card.answer;
  $('#study-answer').hidden = !answerVisible;
  $('#study-hint').hidden = answerVisible;
  $('#study-ratings').hidden = !answerVisible;
}
function revealAnswer() { answerVisible = true; renderStudy(); }
$$('[data-open-deck]').forEach(button => button.addEventListener('click', () => { $('#anki-decks').hidden = true; $('#anki-study').hidden = false; studyIndex = 0; answerVisible = false; renderStudy(); }));
$('#back-to-decks').addEventListener('click', () => { $('#anki-study').hidden = true; $('#anki-decks').hidden = false; });
$('#study-card').addEventListener('click',revealAnswer);
$('#study-card').addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); revealAnswer(); } });
$$('[data-rate]').forEach(button => button.addEventListener('click', () => { studyIndex = (studyIndex + 1) % state.cards.length; answerVisible = false; renderStudy(); showToast(`Réponse : ${button.textContent.trim().split(' ')[0]}.`); }));
$('#app-add-card').addEventListener('click', () => { state.cards.push({deck:'PSYCHOLOGIE COGNITIVE',question:'Nouvelle question',answer:'Nouvelle réponse'}); saveState(); renderNavigation(); showToast('Carte ajoutée.'); });

// Board
const board = $('#app-board');
let boardCounter = 0;
function enableBoardDrag(item) {
  item.addEventListener('pointerdown', event => {
    const canvasRect = board.getBoundingClientRect(); const itemRect = item.getBoundingClientRect(); const sx = event.clientX; const sy = event.clientY; const ox = itemRect.left - canvasRect.left; const oy = itemRect.top - canvasRect.top;
    item.classList.add('moving');
    const move = e => { item.style.left = `${Math.max(0,Math.min(canvasRect.width-itemRect.width,ox+e.clientX-sx))}px`; item.style.top = `${Math.max(0,Math.min(canvasRect.height-itemRect.height,oy+e.clientY-sy))}px`; };
    const end = () => { item.classList.remove('moving'); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',end);
  });
}
$$('.board-item',board).forEach(enableBoardDrag);
$$('[data-board-item]').forEach(button => button.addEventListener('click', () => {
  boardCounter += 1; const type = button.dataset.boardItem; const item = document.createElement('div'); item.contentEditable='true';
  const classMap = {sticky:'board-sticky',text:'board-text',rectangle:'board-rectangle',circle:'board-circle',image:'board-rectangle'};
  item.className = `board-item ${classMap[type]}`; item.style.left = `${20+boardCounter*4}%`; item.style.top = `${35+boardCounter*3}%`; item.innerHTML = type === 'sticky' ? '<b>Nouvelle note</b><small>Double-cliquer pour modifier</small>' : type === 'text' ? 'Commencer à écrire…' : type === 'image' ? '<b>Image</b><small>Déposer un fichier</small>' : 'Nouvelle idée';
  board.appendChild(item); enableBoardDrag(item); showToast('Élément ajouté au canvas.');
}));
$('#board-theme').addEventListener('click',event => { board.classList.toggle('light'); event.currentTarget.textContent = board.classList.contains('light') ? '☾' : '☼'; });
$('#board-export').addEventListener('click', () => openExport('board'));

// Export
function openExport(mode='page') { exportDialog.dataset.mode = mode; $('#export-name').value = mode === 'board' ? 'Canvas de recherche' : currentPage().title; renderExportPreview(); exportDialog.showModal(); }
function renderExportPreview() {
  const preview = $('#live-export-preview');
  if (exportDialog.dataset.mode === 'board') {
    preview.innerHTML = '<header><span>PROJET DE SEMESTRE</span><span>13 JUILLET 2026</span></header><h1>Canvas de recherche</h1><div class="paper-rule"></div><h2>Question de recherche</h2><p>Comment le sommeil affecte-t-il la mémoire de travail ?</p><h2>Méthode</h2><p>Étude intra-sujets avec trois conditions contrôlées.</p><footer><span>Export Folio</span><b>1</b></footer>';
    return;
  }
  let h1=0,h2=0,h3=0;
  const html = currentPage().blocks.map(block => {
    const text = escapeHtml(plain(block.html));
    if (block.type === 'heading1' && text) { h1++;h2=0;h3=0;return `<h2>${h1}. &nbsp;${text}</h2>`; }
    if (block.type === 'heading2' && text) { h2++;h3=0;return `<h3>${h1}.${h2} &nbsp;${text}</h3>`; }
    if (block.type === 'heading3' && text) { h3++;return `<h3>${h1}.${h2}.${h3} &nbsp;${text}</h3>`; }
    if (block.type === 'paragraph') return `<p>${text}</p>`;
    if (block.type === 'bullet') return `<p>• &nbsp;${text}</p>`;
    if (block.type === 'numbered') return `<p>1. &nbsp;${text}</p>`;
    if (block.type === 'todo') return `<p>${block.checked?'☑':'☐'} &nbsp;${text}</p>`;
    if (block.type === 'quote') return `<blockquote>${text}</blockquote>`;
    if (block.type === 'table') return `<table>${block.cells.map((row,i)=>`<tr>${row.map(cell=>`<${i?'td':'th'}>${escapeHtml(cell)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;
    if (block.type === 'columns2' || block.type === 'columns3') return `<div class="export-columns">${(block.columns || []).map(column=>`<section>${column.map(item=>`<p class="export-column-${item.type}">${item.type === 'todo' ? (item.checked?'☑ ':'☐ ') : ''}${escapeHtml(plain(item.html))}</p>`).join('')}</section>`).join('')}</div>`;
    return '';
  }).join('');
  preview.innerHTML = `<header><span>${escapeHtml(currentPage().project.toUpperCase())}</span><span>13 JUILLET 2026</span></header><h1>${escapeHtml(currentPage().title)}</h1><div class="paper-rule"></div>${html}<footer><span>Export Folio</span><b>1</b></footer>`;
}
$('#app-export').addEventListener('click', () => openExport('page'));
$('#pdf-export').addEventListener('click', () => openExport('page'));
$$('[data-export-option]', exportDialog).forEach(button => button.addEventListener('click', () => { const group=button.dataset.exportOption; $$(`[data-export-option="${group}"]`, exportDialog).forEach(peer=>peer.classList.toggle('active',peer===button)); renderExportPreview(); }));
$('#print-document').addEventListener('click', () => window.print());

// Dialogs/profile and local visual customization
let pendingImageTarget = null;
const imageUpload = $('#folio-image-upload');
function openImagePicker(target) {
  pendingImageTarget = target;
  imageUpload.value = '';
  imageUpload.click();
}

function resizedImage(file, target) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const square = target.type === 'avatar';
        const maxWidth = square ? 560 : 1500;
        const maxHeight = square ? 560 : 900;
        const scale = Math.min(1,maxWidth/image.width,maxHeight/image.height);
        const canvas = document.createElement('canvas');
        canvas.width = square ? Math.min(maxWidth,Math.round(image.width*scale)) : Math.max(1,Math.round(image.width*scale));
        canvas.height = square ? Math.min(maxHeight,Math.round(image.height*scale)) : Math.max(1,Math.round(image.height*scale));
        const context = canvas.getContext('2d');
        if (square) {
          const side = Math.min(image.width,image.height);
          context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,canvas.width,canvas.height);
        } else context.drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function applyPersonalization() {
  const profile = state.profile;
  const name = profile.name.trim();
  $('#app-greeting').textContent = name ? `Bonjour, ${name}` : 'Bonjour.';
  $('#profile-name-label').textContent = name || 'Profil';
  $('#profile-name').value = name;
  const avatar = profile.avatar || 'assets/profile-avatar.svg';
  $('#app-profile-avatar').src = avatar;
  $('#sidebar-profile-avatar').src = avatar;
  const homeCover = state.customization.homeCover;
  $('#app-home-cover').style.backgroundImage = homeCover ? `url("${homeCover}")` : '';
  $$('[data-tool-cover]').forEach(cover => {
    const custom = state.customization.toolCovers[cover.dataset.toolCover];
    cover.style.backgroundImage = custom ? `url("${custom}")` : '';
  });
  document.documentElement.style.setProperty('--purple',profile.accent);
  webShell.classList.toggle('hide-page-details',!profile.showDetails);
  $('.app-widgets .clock-mock').hidden = !profile.showClock;
  $('.app-widgets .abstract-widget').hidden = !profile.showPreview;
  $('.app-widgets .today-widget').hidden = !profile.showPreview;
  $('#profile-show-details').checked = profile.showDetails;
  $('#profile-show-clock').checked = profile.showClock;
  $('#profile-show-preview').checked = profile.showPreview;
  $$('[data-accent]').forEach(button => button.classList.toggle('selected',button.dataset.accent === profile.accent));
}

imageUpload.addEventListener('change', async () => {
  const file = imageUpload.files?.[0];
  const target = pendingImageTarget;
  if (!file || !target) return;
  try {
    const data = await resizedImage(file,target);
    if (target.type === 'avatar') state.profile.avatar = data;
    if (target.type === 'home') state.customization.homeCover = data;
    if (target.type === 'tool') state.customization.toolCovers[target.id] = data;
    if (target.type === 'page') {
      const page = state.pages.find(item => item.id === target.id);
      if (page) page.coverImage = data;
    }
    saveState();
    applyPersonalization();
    renderHomePages();
    renderAllNotes();
    showToast('Photo enregistrée sur cet appareil.');
  } catch (_) { showToast('Cette image n’a pas pu être ouverte.'); }
});

$('#app-home-cover').addEventListener('click', () => openImagePicker({type:'home'}));
$('#app-home-cover').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openImagePicker({type:'home'}); } });
$$('[data-tool-cover]').forEach(cover => {
  const open = event => { event.preventDefault(); event.stopPropagation(); openImagePicker({type:'tool',id:cover.dataset.toolCover}); };
  cover.addEventListener('click',open);
  cover.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') open(event); });
});
$('#profile-avatar-upload').addEventListener('click', () => openImagePicker({type:'avatar'}));
$('#profile-home-upload').addEventListener('click', () => openImagePicker({type:'home'}));
$('#profile-name').addEventListener('input', event => { state.profile.name = event.target.value; saveState(); applyPersonalization(); });
[['profile-show-details','showDetails'],['profile-show-clock','showClock'],['profile-show-preview','showPreview']].forEach(([id,key]) => {
  $(`#${id}`).addEventListener('change',event => { state.profile[key] = event.target.checked; saveState(); applyPersonalization(); });
});
$$('[data-accent]').forEach(button => button.addEventListener('click', () => { state.profile.accent = button.dataset.accent; saveState(); applyPersonalization(); }));

$('#profile-button').addEventListener('click', () => { applyPersonalization(); profileDialog.showModal(); });
let donationAmount = 5;
$$('[data-donation]').forEach(button => button.addEventListener('click', () => {
  donationAmount = Number(button.dataset.donation);
  $$('[data-donation]').forEach(item => item.classList.toggle('active',item === button));
  $('#custom-donation').value = '';
  $('#support-total').textContent = `${donationAmount} CHF`;
}));
$('#custom-donation')?.addEventListener('input', event => {
  const amount = Math.max(1,Math.round(Number(event.target.value) || 0));
  if (!event.target.value) return;
  donationAmount = amount;
  $$('[data-donation]').forEach(item => item.classList.remove('active'));
  $('#support-total').textContent = `${donationAmount} CHF`;
});
$('#open-support')?.addEventListener('click', () => { $('#support-dialog-total').textContent = `${donationAmount} CHF`; supportDialog.showModal(); });
$('#support-confirm')?.addEventListener('click', () => showToast('Ajoutez le lien TWINT marchand pour activer ce paiement.'));
$$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close()));
[exportDialog,profileDialog,downloadDialog,supportDialog].forEach(dialog => dialog.addEventListener('click',event => { if (event.target === dialog) dialog.close(); }));

document.addEventListener('click', event => {
  if (!event.target.closest('#app-slash-menu,.block-plus,.block-content')) slashMenu.hidden = true;
  if (!event.target.closest('#app-block-menu,.block-grip')) blockMenu.hidden = true;
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeFloatingUI(); sidebar.classList.remove('mobile-open');
    if (webShell.classList.contains('focus-mode')) webShell.classList.remove('focus-mode');
    return;
  }
  if (appView.hidden) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); createPage(); }
  const typing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (currentRoute === 'anki' && !typing && !$('#anki-study').hidden) {
    if (event.key === ' ') { event.preventDefault(); revealAnswer(); }
    if (answerVisible && ['1','2','3','4'].includes(event.key)) $$('[data-rate]')[Number(event.key)-1].click();
  }
});

window.addEventListener('hashchange', () => {
  if (location.hash === '#web') setExperience('app', false);
  else if (!appView.hidden) setExperience('site', false);
});

renderNavigation();
renderHomePages();
renderAllNotes();
renderStudy();
renderExportPreview();
applyPersonalization();
if (location.hash === '#web') setExperience('app',false);
