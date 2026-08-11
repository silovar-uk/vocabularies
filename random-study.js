(() => {
  let history = [];
  let currentId = null;
  let started = false;

  const panel = document.querySelector('#randomStudyCard');
  const start = document.querySelector('#randomStudyStart');
  const section = document.querySelector('.random-study');
  if (!panel || !start || !section) return;

  const mobileNext = document.createElement('button');
  mobileNext.type = 'button';
  mobileNext.className = 'random-study-mobile-next';
  mobileNext.textContent = '次の一語 →';
  mobileNext.hidden = true;
  document.body.appendChild(mobileNext);

  function items() { return Array.isArray(window.vocabularyStudyItems) ? window.vocabularyStudyItems : []; }
  function esc(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function getCurrentItem() { return items().find(item => item.id === currentId) ?? null; }
  function chooseNext() {
    const pool = items();
    if (!pool.length) return null;
    const recent = new Set(history.slice(-Math.min(8, Math.max(1, pool.length - 1))));
    let candidates = pool.filter(x => x.id !== currentId && !recent.has(x.id));
    if (!candidates.length) candidates = pool.filter(x => x.id !== currentId);
    if (!candidates.length) candidates = pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  function renderItem(item) {
    if (!item) { panel.innerHTML = '<p class="random-study-placeholder">語彙を読み込み中…</p>'; return; }
    currentId = item.id;
    history.push(item.id);
    if (history.length > 40) history.shift();
    started = true;
    document.body.classList.add('random-study-active');
    mobileNext.hidden = false;
    start.textContent = '次の一語 →';
    const ja = item.ja || item.term || '';
    const en = item.ja && item.term ? item.term : '';
    panel.classList.add('is-changing');
    setTimeout(() => {
      panel.innerHTML = `<div class="random-study-copy"><h3 class="random-study-term">${esc(ja)}</h3>${en ? `<p class="random-study-en">${esc(en)}</p>` : ''}<p class="random-study-line">${esc(item.one_liner || item.description || '')}</p></div><div class="random-study-actions"><button class="random-study-next" type="button">次の一語 →</button><button class="random-study-read" type="button" data-study-open="${esc(item.id)}">詳しく読む</button><span class="random-study-count">${history.length}語目</span></div><p class="random-study-note">直近の語はなるべく除外しています</p>`;
      panel.classList.remove('is-changing');
    }, 70);
  }
  function next(options = {}) {
    const item = chooseNext();
    if (!item) return null;
    renderItem(item);
    window.dispatchEvent(new CustomEvent('random-study-changed', { detail: { item, openReader: Boolean(options.openReader) } }));
    return item;
  }
  function openCurrent() {
    const item = getCurrentItem();
    if (!item) return;
    document.querySelector(`[data-open-term="${CSS.escape(item.id)}"]`)?.click();
  }
  function isTypingTarget(target) {
    return target instanceof HTMLElement && (target.matches('input, textarea, select, [contenteditable="true"]') || Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));
  }

  start.addEventListener('click', () => next());
  mobileNext.addEventListener('click', () => next());
  panel.addEventListener('click', e => {
    if (e.target.closest('.random-study-next')) return next();
    const open = e.target.closest('[data-study-open]');
    if (!open) return;
    openCurrent();
  });
  window.addEventListener('keydown', event => {
    if (isTypingTarget(event.target) || document.body.classList.contains('reader-open')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target instanceof HTMLElement && event.target.closest('button, a')) return;
      event.preventDefault(); next();
    }
    if (event.key.toLowerCase() === 'd' && started) { event.preventDefault(); openCurrent(); }
  });

  window.VocabularyRandomStudy = { next, openCurrent, getCurrentItem };
  const initialize = () => { if (items().length && !started) next(); };
  window.addEventListener('vocabulary-items-ready', initialize, { once: true });
  initialize();
})();