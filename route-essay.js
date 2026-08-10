(() => {
  const ROUTES_KEY = 'vocabularies:concept-routes:v1';
  const ANNOTATIONS_KEY = 'vocabularies:route-annotations:v1';
  const page = document.querySelector('#routeEssay');
  if (!page) return;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function routeById(id) {
    const routes = readJson(ROUTES_KEY, []);
    return Array.isArray(routes) ? routes.find((route) => route.id === id) : null;
  }

  function annotationsFor(id) {
    const all = readJson(ANNOTATIONS_KEY, {});
    return all && typeof all === 'object' && !Array.isArray(all) ? (all[id] ?? {}) : {};
  }

  function conceptHref(item) {
    return './concept-map.html?term=' + encodeURIComponent(item.id);
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
      return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(timestamp));
    } catch {
      return '';
    }
  }

  function noteAt(notes, index) {
    return String(notes?.[index] ?? '').trim();
  }

  function markdownFor(route, notes) {
    const lines = ['# ' + route.name, '', route.items.map((item) => item.label || item.id).join(' → '), ''];
    route.items.forEach((item, index) => {
      lines.push('## ' + (index + 1) + '. ' + (item.label || item.id));
      const note = noteAt(notes, index);
      if (note) lines.push('', note);
      if (index < route.items.length - 1) lines.push('', '→ ' + (route.items[index + 1].label || route.items[index + 1].id) + 'へ', '');
    });
    return lines.join('\n').trim();
  }

  function renderError(title, text) {
    page.innerHTML = '<section class="route-essay-error"><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(text) + '</p><p><a href="./">語彙集へ戻る</a></p></section>';
  }

  function render(route, notes) {
    const annotatedCount = route.items.filter((_, index) => noteAt(notes, index)).length;
    const date = formatDate(route.createdAt);
    const firstNote = route.items.map((_, index) => noteAt(notes, index)).find(Boolean);

    document.title = route.name + ' — Route Essay — Vocabularies';

    page.innerHTML = '<article>' +
      '<header class="route-essay-hero">' +
        '<p class="route-essay-kicker">ROUTE ESSAY</p>' +
        '<h1 class="route-essay-title">' + escapeHtml(route.name) + '</h1>' +
        '<p class="route-essay-meta">' + route.items.length + ' concepts' + (annotatedCount ? ' / ' + annotatedCount + ' annotations' : '') + (date ? ' / ' + escapeHtml(date) : '') + '</p>' +
        '<div class="route-essay-path">' + route.items.map((item, index) =>
          (index ? '<i aria-hidden="true">→</i>' : '') + '<a href="' + conceptHref(item) + '">' + escapeHtml(item.label || item.id) + '</a>'
        ).join('') + '</div>' +
        '<p class="route-essay-intro' + (firstNote ? '' : ' is-empty') + '">' +
          (firstNote ? escapeHtml(firstNote) : 'このルートにはまだ注釈がありません。概念の順番だけを、そのまま思考の骨格として表示しています。') +
        '</p>' +
        '<div class="route-essay-tools">' +
          '<button id="copyRouteEssay" type="button">Markdownでコピー</button>' +
          '<a href="./concept-map.html?term=' + encodeURIComponent(route.items[0]?.id || '') + '">最初の概念から地図を開く</a>' +
          '<span id="copyRouteStatus" class="route-essay-copy-status" aria-live="polite"></span>' +
        '</div>' +
      '</header>' +
      '<div class="route-essay-body">' +
        route.items.map((item, index) => {
          const note = noteAt(notes, index);
          const next = route.items[index + 1];
          return '<section class="route-essay-step">' +
            '<span class="route-essay-number">' + (index + 1) + '</span>' +
            '<h2><a href="' + conceptHref(item) + '">' + escapeHtml(item.label || item.id) + '</a></h2>' +
            '<p class="route-essay-note' + (note ? '' : ' is-empty') + '">' + (note ? escapeHtml(note) : '注釈なし') + '</p>' +
            (next ? '<p class="route-essay-transition">NEXT → ' + escapeHtml(next.label || next.id) + '</p>' : '') +
          '</section>';
        }).join('') +
      '</div>' +
    '</article>';

    document.querySelector('#copyRouteEssay')?.addEventListener('click', async () => {
      const status = document.querySelector('#copyRouteStatus');
      try {
        await navigator.clipboard.writeText(markdownFor(route, notes));
        if (status) status.textContent = 'コピーしました';
      } catch {
        if (status) status.textContent = 'コピーできませんでした';
      }
      window.setTimeout(() => { if (status) status.textContent = ''; }, 1800);
    });
  }

  const id = new URLSearchParams(location.search).get('route');
  if (!id) {
    renderError('ルートが指定されていません。', 'Concept TrailのSaved Routesから「論考で読む」を選んでください。');
    return;
  }

  const route = routeById(id);
  if (!route || !Array.isArray(route.items) || !route.items.length) {
    renderError('このルートを見つけられませんでした。', '保存先はこの端末のブラウザ内です。ルートが削除されていないか確認してください。');
    return;
  }

  render(route, annotationsFor(id));
})();
