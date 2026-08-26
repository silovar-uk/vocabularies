(() => {
  let history = [];
  let cursor = -1;
  let currentId = null;
  let started = false;
  let engaged = false;

  const panel = document.querySelector('#randomStudyCard');
  const start = document.querySelector('#randomStudyStart');
  const section = document.querySelector('.random-study');
  if (!panel || !start || !section) return;

  panel.tabIndex = 0;
  panel.setAttribute('aria-label', 'ランダム学習。左右キーで前後、EnterまたはSpaceで次の一語、Dで詳しく見る');

  const mobileNext = document.createElement('button');
  mobileNext.type = 'button';
  mobileNext.className = 'random-study-mobile-next';
  mobileNext.textContent = '次の一語 →';
  mobileNext.hidden = true;
  document.body.appendChild(mobileNext);

  function items() { return Array.isArray(window.vocabularyStudyItems) ? window.vocabularyStudyItems : []; }
  function esc(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function itemById(id) { return items().find(item => item.id === id) ?? null; }
  function getCurrentItem() { return itemById(currentId); }

  function markEngaged() {
    if (engaged) return;
    engaged = true;
    document.body.classList.add('random-study-active');
    mobileNext.hidden = false;
  }

  function chooseNewItem() {
    const pool = items();
    if (!pool.length) return null;
    const recent = new Set(history.slice(-Math.min(8, Math.max(1, pool.length - 1))));
    let candidates = pool.filter(item => item.id !== currentId && !recent.has(item.id));
    if (!candidates.length) candidates = pool.filter(item => item.id !== currentId);
    if (!candidates.length) candidates = pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function renderItem(item) {
    if (!item) {
      panel.innerHTML = '<p class="random-study-placeholder">語彙を読み込み中…</p>';
      return;
    }

    currentId = item.id;
    started = true;
    start.textContent = '次の一語 →';

    const ja = item.ja || item.term || '';
    const en = item.ja && item.term ? item.term : '';
    const canGoBack = cursor > 0;

    panel.classList.add('is-changing');
    setTimeout(() => {
      panel.innerHTML = `<div class="random-study-copy"><h3 class="random-study-term">${esc(ja)}</h3>${en ? `<p class="random-study-en">${esc(en)}</p>` : ''}<p class="random-study-line">${esc(item.one_liner || item.description || '')}</p></div><div class="random-study-actions"><button class="random-study-prev" type="button" ${canGoBack ? '' : 'disabled'} aria-label="一つ前の語に戻る">← 前の一語</button><button class="random-study-next" type="button">次の一語 →</button><button class="random-study-read" type="button" data-study-open="${esc(item.id)}">詳しく見る</button><span class="random-study-count">${cursor + 1}語目</span></div><p class="random-study-note">直近の語はなるべく除外しています</p>`;
      panel.classList.remove('is-changing');
    }, 70);
  }

  function showCursor(options = {}) {
    const item = itemById(history[cursor]);
    if (!item) return null;
    renderItem(item);
    window.dispatchEvent(new CustomEvent('random-study-changed', { detail: { item, openReader: Boolean(options.openReader), direction: options.direction || 'stay' } }));
    return item;
  }

  function next(options = {}) {
    if (cursor < history.length - 1) {
      cursor += 1;
      return showCursor({ ...options, direction: 'forward' });
    }

    const item = chooseNewItem();
    if (!item) return null;
    history.push(item.id);
    if (history.length > 40) history.shift();
    cursor = history.length - 1;
    return showCursor({ ...options, direction: 'new' });
  }

  function previous(options = {}) {
    if (cursor <= 0) return null;
    cursor -= 1;
    return showCursor({ ...options, direction: 'back' });
  }

  function openCurrent(trigger = panel) {
    const item = getCurrentItem();
    if (!item) return;
    if (window.VocabularyReader?.open) {
      window.VocabularyReader.open(item.id, { trigger });
      return;
    }
    document.querySelector(`[data-open-term="${CSS.escape(item.id)}"]`)?.click();
  }

  start.addEventListener('click', () => { markEngaged(); next(); });
  mobileNext.addEventListener('click', () => { markEngaged(); next(); });

  panel.addEventListener('click', event => {
    if (event.target.closest('.random-study-prev')) { markEngaged(); return previous(); }
    if (event.target.closest('.random-study-next')) { markEngaged(); return next(); }
    const open = event.target.closest('[data-study-open]');
    if (!open) return;
    markEngaged();
    openCurrent(open);
  });

  panel.addEventListener('keydown', event => {
    if (document.body.classList.contains('reader-open')) return;
    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, summary, [role="button"], [contenteditable="true"]')) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      markEngaged();
      previous();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      markEngaged();
      next();
      return;
    }
    if (event.key.toLowerCase() === 'd' && started) {
      event.preventDefault();
      markEngaged();
      openCurrent(panel);
    }
  });

  window.VocabularyRandomStudy = { next, previous, openCurrent, getCurrentItem };

  const initialize = () => {
    if (items().length && !started) next();
  };
  window.addEventListener('vocabulary-items-ready', initialize, { once: true });
  initialize();
})();