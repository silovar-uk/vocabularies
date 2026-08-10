(() => {
  const STORAGE_KEY = 'vocabularies:concept-trail:v1';
  const MAX_ITEMS = 20;
  let open = false;
  let trail = readTrail();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function readTrail() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-MAX_ITEMS) : [];
    } catch {
      return [];
    }
  }

  function saveTrail() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
    } catch {
      // Trail is optional. Browsing must keep working when storage is unavailable.
    }
  }

  function ensureUi() {
    let root = document.querySelector('#conceptTrail');
    if (root) return root;

    root = document.createElement('aside');
    root.id = 'conceptTrail';
    root.className = 'concept-trail';
    root.setAttribute('aria-label', '概念の足跡');
    root.innerHTML =
      '<button class="concept-trail-toggle" type="button" aria-expanded="false">' +
        '<span class="concept-trail-toggle-label">概念の足跡</span>' +
        '<span class="concept-trail-count">0</span>' +
        '<span class="concept-trail-chevron" aria-hidden="true">⌃</span>' +
      '</button>' +
      '<div class="concept-trail-panel" hidden>' +
        '<div class="concept-trail-head">' +
          '<div><strong>Concept Trail</strong><span>辿った言葉を、順番ごと残す。</span></div>' +
          '<button class="concept-trail-clear" type="button">履歴を消す</button>' +
        '</div>' +
        '<div class="concept-trail-list"></div>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelector('.concept-trail-toggle').addEventListener('click', () => {
      open = !open;
      render();
    });

    root.querySelector('.concept-trail-clear').addEventListener('click', () => {
      if (!trail.length) return;
      if (!window.confirm('概念の足跡をすべて消しますか？')) return;
      trail = [];
      saveTrail();
      render();
    });

    return root;
  }

  function hrefFor(item) {
    return './concept-map.html?term=' + encodeURIComponent(item.id);
  }

  function render() {
    const root = ensureUi();
    const toggle = root.querySelector('.concept-trail-toggle');
    const panel = root.querySelector('.concept-trail-panel');
    const count = root.querySelector('.concept-trail-count');
    const list = root.querySelector('.concept-trail-list');

    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    root.classList.toggle('is-open', open);
    count.textContent = String(trail.length);

    if (!trail.length) {
      list.innerHTML = '<p class="concept-trail-empty">まだ足跡はありません。言葉を読んだり、概念地図を辿るとここに残ります。</p>';
      return;
    }

    list.innerHTML = trail.map((item, index) =>
      '<span class="concept-trail-step">' +
        (index ? '<span class="concept-trail-arrow" aria-hidden="true">→</span>' : '') +
        '<a href="' + hrefFor(item) + '">' + escapeHtml(item.label || item.id) + '</a>' +
      '</span>'
    ).join('');

    requestAnimationFrame(() => {
      list.scrollLeft = list.scrollWidth;
    });
  }

  function record(id, label) {
    id = String(id || '').trim();
    if (!id) return;
    const safeLabel = String(label || id).trim() || id;
    const last = trail[trail.length - 1];

    if (last?.id === id) {
      if (last.label !== safeLabel) {
        last.label = safeLabel;
        saveTrail();
        render();
      }
      return;
    }

    trail.push({ id, label: safeLabel, at: Date.now() });
    trail = trail.slice(-MAX_ITEMS);
    saveTrail();
    render();
  }

  function clear() {
    trail = [];
    saveTrail();
    render();
  }

  window.VocabularyTrail = {
    record,
    clear,
    get: () => trail.map((item) => ({ ...item })),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
