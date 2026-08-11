(() => {
  let history = [];
  let currentId = null;

  const panel = document.querySelector('#randomStudyCard');
  const start = document.querySelector('#randomStudyStart');
  if (!panel || !start) return;

  function items() {
    return Array.isArray(window.vocabularyStudyItems) ? window.vocabularyStudyItems : [];
  }

  function esc(v) {
    return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function draw() {
    const pool = items();
    if (!pool.length) {
      panel.innerHTML = '<p class="random-study-placeholder">語彙を読み込み中…</p>';
      return;
    }
    const recent = new Set(history.slice(-Math.min(8, Math.max(1, pool.length - 1))));
    let candidates = pool.filter(x => x.id !== currentId && !recent.has(x.id));
    if (!candidates.length) candidates = pool.filter(x => x.id !== currentId);
    if (!candidates.length) candidates = pool;
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    currentId = item.id;
    history.push(item.id);
    if (history.length > 40) history.shift();
    const ja = item.ja || item.term || '';
    const en = item.ja && item.term ? item.term : '';
    panel.classList.add('is-changing');
    setTimeout(() => {
      panel.innerHTML = `<h3 class="random-study-term">${esc(ja)}</h3>${en ? `<p class="random-study-en">${esc(en)}</p>` : ''}<p class="random-study-line">${esc(item.one_liner || item.description || '')}</p><div class="random-study-actions"><button class="random-study-next" type="button">もう一語 →</button><button class="random-study-read" type="button" data-study-open="${esc(item.id)}">詳しく読む</button><span class="random-study-count">今回 ${history.length}語</span></div>`;
      panel.classList.remove('is-changing');
    }, 90);
  }

  start.addEventListener('click', draw);
  panel.addEventListener('click', e => {
    if (e.target.closest('.random-study-next')) return draw();
    const open = e.target.closest('[data-study-open]');
    if (!open) return;
    document.querySelector(`[data-open-term="${CSS.escape(open.dataset.studyOpen)}"]`)?.click();
  });
  window.addEventListener('vocabulary-items-ready', draw, { once: true });
})();