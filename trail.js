(() => {
  const STORAGE_KEY = 'vocabularies:concept-trail:v1';
  const ROUTES_KEY = 'vocabularies:concept-routes:v1';
  const MAX_ITEMS = 20;
  const MAX_ROUTES = 30;
  const MIN_ROUTE_ITEMS = 3;
  const MAX_ROUTE_ITEMS = 10;

  let open = false;
  let routeMode = false;
  let trail = readList(STORAGE_KEY, MAX_ITEMS);
  let routes = readList(ROUTES_KEY, MAX_ROUTES);
  let selectedRouteIndexes = new Set();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function readList(key, max) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-max) : [];
    } catch {
      return [];
    }
  }

  function writeList(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local history is optional. The vocabulary browser should never depend on storage.
    }
  }

  function saveTrail() {
    writeList(STORAGE_KEY, trail);
  }

  function saveRoutes() {
    writeList(ROUTES_KEY, routes);
  }

  function defaultRouteSelection() {
    selectedRouteIndexes = new Set();
    const start = Math.max(0, trail.length - Math.min(5, trail.length));
    for (let index = start; index < trail.length; index += 1) {
      selectedRouteIndexes.add(index);
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
          '<div class="concept-trail-head-actions">' +
            '<button class="concept-route-start" type="button">ルートとして保存</button>' +
            '<button class="concept-trail-clear" type="button">履歴を消す</button>' +
          '</div>' +
        '</div>' +
        '<div class="concept-route-builder" hidden></div>' +
        '<div class="concept-trail-list"></div>' +
        '<section class="concept-routes" aria-label="保存した思考ルート">' +
          '<div class="concept-routes-head"><strong>Saved Routes</strong><span class="concept-routes-count"></span></div>' +
          '<div class="concept-routes-list"></div>' +
        '</section>' +
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
      routeMode = false;
      selectedRouteIndexes.clear();
      saveTrail();
      render();
    });

    root.querySelector('.concept-route-start').addEventListener('click', () => {
      if (trail.length < MIN_ROUTE_ITEMS) return;
      routeMode = !routeMode;
      if (routeMode) defaultRouteSelection();
      render();
      if (routeMode) requestAnimationFrame(() => root.querySelector('.concept-route-name')?.focus());
    });

    root.querySelector('.concept-trail-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-route-index]');
      if (!button || !routeMode) return;
      const index = Number(button.dataset.routeIndex);
      if (!Number.isInteger(index)) return;
      if (selectedRouteIndexes.has(index)) {
        selectedRouteIndexes.delete(index);
      } else if (selectedRouteIndexes.size < MAX_ROUTE_ITEMS) {
        selectedRouteIndexes.add(index);
      }
      render();
    });

    root.querySelector('.concept-route-builder').addEventListener('click', (event) => {
      const saveButton = event.target.closest('[data-save-route]');
      if (saveButton) saveCurrentRoute();
      const cancelButton = event.target.closest('[data-cancel-route]');
      if (cancelButton) {
        routeMode = false;
        selectedRouteIndexes.clear();
        render();
      }
    });

    root.querySelector('.concept-route-builder').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('.concept-route-name')) {
        event.preventDefault();
        saveCurrentRoute();
      }
    });

    root.querySelector('.concept-routes-list').addEventListener('click', (event) => {
      const deleteButton = event.target.closest('[data-delete-route]');
      if (!deleteButton) return;
      const id = deleteButton.dataset.deleteRoute;
      const route = routes.find((candidate) => candidate.id === id);
      if (!route) return;
      if (!window.confirm('「' + route.name + '」を削除しますか？')) return;
      routes = routes.filter((candidate) => candidate.id !== id);
      saveRoutes();
      render();
    });

    return root;
  }

  function hrefFor(item) {
    return './concept-map.html?term=' + encodeURIComponent(item.id);
  }

  function routeSelection() {
    return [...selectedRouteIndexes]
      .sort((a, b) => a - b)
      .map((index) => trail[index])
      .filter(Boolean);
  }

  function renderTrail(list) {
    if (!trail.length) {
      list.innerHTML = '<p class="concept-trail-empty">まだ足跡はありません。言葉を読んだり、概念地図を辿るとここに残ります。</p>';
      return;
    }

    list.innerHTML = trail.map((item, index) => {
      const selected = selectedRouteIndexes.has(index);
      const body = routeMode
        ? '<button type="button" class="concept-trail-route-choice' + (selected ? ' is-selected' : '') + '" data-route-index="' + index + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
            '<span class="concept-route-check" aria-hidden="true">' + (selected ? '✓' : '') + '</span>' +
            escapeHtml(item.label || item.id) +
          '</button>'
        : '<a href="' + hrefFor(item) + '">' + escapeHtml(item.label || item.id) + '</a>';

      return '<span class="concept-trail-step">' +
        (index ? '<span class="concept-trail-arrow" aria-hidden="true">→</span>' : '') +
        body +
      '</span>';
    }).join('');

    requestAnimationFrame(() => {
      list.scrollLeft = list.scrollWidth;
    });
  }

  function renderRouteBuilder(builder) {
    builder.hidden = !routeMode;
    if (!routeMode) {
      builder.innerHTML = '';
      return;
    }

    const count = selectedRouteIndexes.size;
    const valid = count >= MIN_ROUTE_ITEMS && count <= MAX_ROUTE_ITEMS;
    builder.innerHTML =
      '<div class="concept-route-builder-copy">' +
        '<strong>この足跡を、思考ルートとして残す。</strong>' +
        '<span>3〜10語を選択。順番は辿った順のまま保存されます。</span>' +
      '</div>' +
      '<div class="concept-route-form">' +
        '<input class="concept-route-name" type="text" maxlength="40" placeholder="例：AIと認知 / 文章の精度" aria-label="ルート名" />' +
        '<span class="concept-route-selected-count">' + count + '語選択</span>' +
        '<button type="button" data-save-route ' + (valid ? '' : 'disabled') + '>保存</button>' +
        '<button type="button" data-cancel-route>やめる</button>' +
      '</div>';
  }

  function renderRoutes(root) {
    const list = root.querySelector('.concept-routes-list');
    const count = root.querySelector('.concept-routes-count');
    count.textContent = routes.length ? routes.length + '件' : '';

    if (!routes.length) {
      list.innerHTML = '<p class="concept-routes-empty">保存したルートはまだありません。</p>';
      return;
    }

    list.innerHTML = [...routes].reverse().map((route) =>
      '<article class="concept-route-card">' +
        '<div class="concept-route-card-head">' +
          '<strong>' + escapeHtml(route.name) + '</strong>' +
          '<button type="button" data-delete-route="' + escapeAttr(route.id) + '" aria-label="' + escapeAttr(route.name) + 'を削除">削除</button>' +
        '</div>' +
        '<div class="concept-route-path">' +
          (route.items || []).map((item, index) =>
            '<span>' +
              (index ? '<i aria-hidden="true">→</i>' : '') +
              '<a href="' + hrefFor(item) + '">' + escapeHtml(item.label || item.id) + '</a>' +
            '</span>'
          ).join('') +
        '</div>' +
      '</article>'
    ).join('');
  }

  function render() {
    const root = ensureUi();
    const toggle = root.querySelector('.concept-trail-toggle');
    const panel = root.querySelector('.concept-trail-panel');
    const count = root.querySelector('.concept-trail-count');
    const list = root.querySelector('.concept-trail-list');
    const builder = root.querySelector('.concept-route-builder');
    const routeStart = root.querySelector('.concept-route-start');

    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    root.classList.toggle('is-open', open);
    root.classList.toggle('is-route-mode', routeMode);
    count.textContent = String(trail.length);
    routeStart.textContent = routeMode ? '選択中' : 'ルートとして保存';
    routeStart.disabled = trail.length < MIN_ROUTE_ITEMS;

    renderRouteBuilder(builder);
    renderTrail(list);
    renderRoutes(root);
  }

  function saveCurrentRoute() {
    const root = ensureUi();
    const nameInput = root.querySelector('.concept-route-name');
    const name = String(nameInput?.value || '').trim();
    const items = routeSelection();

    if (items.length < MIN_ROUTE_ITEMS || items.length > MAX_ROUTE_ITEMS) return;
    if (!name) {
      nameInput?.focus();
      nameInput?.setAttribute('aria-invalid', 'true');
      return;
    }

    routes.push({
      id: 'route-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      name,
      items: items.map((item) => ({ id: item.id, label: item.label || item.id })),
      createdAt: Date.now(),
    });
    routes = routes.slice(-MAX_ROUTES);
    saveRoutes();
    routeMode = false;
    selectedRouteIndexes.clear();
    render();
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
    if (routeMode) defaultRouteSelection();
    render();
  }

  function clear() {
    trail = [];
    routeMode = false;
    selectedRouteIndexes.clear();
    saveTrail();
    render();
  }

  window.VocabularyTrail = {
    record,
    clear,
    get: () => trail.map((item) => ({ ...item })),
    getRoutes: () => routes.map((route) => ({ ...route, items: route.items.map((item) => ({ ...item })) })),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
