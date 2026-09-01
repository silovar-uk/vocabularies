(() => {
  const searchInput = document.querySelector('#mapSearch');
  const searchResults = document.querySelector('#mapSearchResults');
  const randomFocus = document.querySelector('#randomFocus');
  const focusMap = document.querySelector('#focusMap');
  const focusCount = document.querySelector('#focusCount');
  const verbFilters = document.querySelector('#verbFilters');
  const routeList = document.querySelector('#routeList');
  const clearVerb = document.querySelector('#clearVerb');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const relationGrammar = globalThis.VocabularyRelationGrammar;
  const jsonRequestCache = new Map();
  let initialFocusId = null;

  const state = {
    catalog: null,
    items: new Map(),
    essays: {},
    edges: [],
    typedEdges: [],
    clusters: [],
    roleDefinitions: {},
    softPathPilot: null,
    focusId: null,
    activeFamily: null,
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function loadJson(path) {
    const clean = String(path).replace(/^\.\//, '');
    if (jsonRequestCache.has(clean)) return jsonRequestCache.get(clean);

    const request = (async () => {
      const urls = [
        './' + clean,
        'https://raw.githubusercontent.com/silovar-uk/vocabularies/main/' + clean,
      ];
      let lastError;
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return await response.json();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError ?? new Error('Could not load ' + clean);
    })();

    jsonRequestCache.set(clean, request);
    try {
      return await request;
    } catch (error) {
      jsonRequestCache.delete(clean);
      throw error;
    }
  }

  function applyCatalog(item) {
    if (!item) return null;
    return {
      ...(state.catalog?.defaults ?? {}),
      ...item,
      ...(state.catalog?.terms?.[item.id] ?? {}),
    };
  }

  function displayNames(item) {
    const ja = String(item?.ja ?? '').trim();
    const en = String(item?.term ?? '').trim();
    const englishFirst = item?.primary_language === 'en' || !ja;
    return englishFirst ? { primary: en, secondary: ja } : { primary: ja, secondary: en };
  }

  function fieldLabel(field) {
    return state.catalog?.field_labels?.[field] ?? field;
  }

  function itemById(id) {
    return applyCatalog(state.items.get(id));
  }

  function nameById(id) {
    return displayNames(itemById(id)).primary || id;
  }

  function clustersFor(id) {
    return state.clusters.filter((cluster) => cluster?.members?.includes(id));
  }

  async function loadEssayMap(index) {
    const entries = Object.entries(index.essays ?? {}).filter(([, entry]) => entry?.status === 'published');
    const paths = [...new Set(entries.map(([, entry]) => entry.path || entry.bundle_path).filter(Boolean))];
    const loaded = await Promise.all(paths.map(async (path) => [path, await loadJson(path)]));
    const byPath = new Map(loaded);
    const essays = {};

    entries.forEach(([id, entry]) => {
      const source = byPath.get(entry.path || entry.bundle_path);
      const essay = entry.path ? source : source?.[id];
      if (essay) essays[id] = essay;
    });
    return essays;
  }

  function buildEdges() {
    const seen = new Set();
    const edges = [];
    Object.entries(state.essays).forEach(([source, essay]) => {
      (essay.relations ?? []).forEach((relation) => {
        const target = relation.term_id;
        if (!target || !state.items.has(target)) return;
        const verb = String(relation.verb || '関連する').trim();
        const key = [source, target, verb].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        const semantic = relationGrammar?.classifyVerb(verb)
          ?? { kind: 'NEAR', label: '近接', symbol: '≈', exact: false };
        const family = relationGrammar?.classifyVerbFamily?.(verb) ?? null;
        edges.push({
          source,
          target,
          verb,
          note: relation.note || '',
          kind: semantic.kind,
          family: family?.family ?? null,
        });
      });
    });
    return edges;
  }

  function buildTypedEdges(relationCollections) {
    const edges = [];
    relationCollections.forEach((relations) => {
      Object.entries(relations ?? {}).forEach(([source, related]) => {
        (related ?? []).forEach((relation) => {
          const target = relation?.id;
          if (!source || !target || !state.items.has(source) || !state.items.has(target)) return;
          const semantic = relationGrammar?.classifyType(relation.type)
            ?? { kind: 'NEAR', label: '近接', symbol: '≈', exact: false };
          edges.push({
            source,
            target,
            type: String(relation.type || '関連').trim(),
            note: String(relation.note || '').trim(),
            kind: semantic.kind,
          });
        });
      });
    });
    return edges;
  }

  function setFocus(id, options = {}) {
    if (!state.items.has(id)) return false;
    const { updateUrl = true, historyMode = 'push' } = options;
    if (state.focusId === id) return true;
    state.focusId = id;
    window.VocabularyTrail?.record(id, nameById(id));
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('term', id);
      history[historyMode === 'replace' ? 'replaceState' : 'pushState'](null, '', url);
    }
    renderFocus();
    return true;
  }

  function focusIdFromLocation() {
    const requested = new URLSearchParams(window.location.search).get('term');
    return requested && state.items.has(requested) ? requested : initialFocusId;
  }

  function scrollFocusMap() {
    document.querySelector('.focus-map')?.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function focusEdges(direction) {
    if (!state.focusId) return [];
    return direction === 'outgoing'
      ? state.edges.filter((edge) => edge.source === state.focusId)
      : state.edges.filter((edge) => edge.target === state.focusId);
  }

  function familyAttribute(edge) {
    return edge.family ? ' data-verb-family="' + escapeHtml(edge.family.toLowerCase()) + '"' : '';
  }

  function renderEdge(edge, direction) {
    const otherId = direction === 'outgoing' ? edge.target : edge.source;
    const kind = String(edge.kind || 'NEAR').toLowerCase();
    return '<a class="focus-edge" href="./concept-map.html?term=' + encodeURIComponent(otherId) + '" data-focus-term="' + escapeHtml(otherId) + '" data-relation-kind="' + escapeHtml(kind) + '"' + familyAttribute(edge) + '>' +
      '<span class="focus-edge-verb">' + escapeHtml(direction === 'outgoing' ? edge.verb + ' →' : '← ' + edge.verb) + '</span>' +
      '<span class="focus-edge-name">' + escapeHtml(nameById(otherId)) + '</span>' +
      (edge.note ? '<span class="focus-edge-note">' + escapeHtml(edge.note) + '</span>' : '') +
    '</a>';
  }

  function pilotClusterFor(id) {
    const ids = new Set(state.softPathPilot?.cluster_ids ?? []);
    return state.clusters.find((cluster) => ids.has(cluster.id) && cluster?.members?.includes(id) && cluster?.roles?.[id]) ?? null;
  }

  function deriveSoftPathCandidates(id) {
    const cluster = pilotClusterFor(id);
    if (!cluster) return null;
    const roles = cluster.roles ?? {};
    const currentRole = roles[id];
    const priorities = state.softPathPilot?.role_priority?.[currentRole] ?? Object.keys(state.roleDefinitions);
    const rankFor = (roleId) => {
      const index = priorities.indexOf(roleId);
      return index === -1 ? priorities.length + 1 : index;
    };
    const memberSet = new Set(cluster.members ?? []);
    const possibilities = [];

    state.typedEdges.forEach((relation) => {
      let targetId = null;
      let direction = null;
      if (relation.source === id && memberSet.has(relation.target)) {
        targetId = relation.target;
        direction = 'outgoing';
      } else if (relation.target === id && memberSet.has(relation.source)) {
        targetId = relation.source;
        direction = 'incoming';
      }
      if (!targetId || !roles[targetId]) return;
      possibilities.push({
        id: targetId,
        role: roles[targetId],
        direction,
        relation,
        rank: rankFor(roles[targetId]),
      });
    });

    possibilities.sort((a, b) =>
      a.rank - b.rank ||
      (a.direction === 'outgoing' ? 0 : 1) - (b.direction === 'outgoing' ? 0 : 1) ||
      a.id.localeCompare(b.id)
    );

    const seen = new Set();
    const maxCandidates = Math.max(2, Math.min(3, Number(state.softPathPilot?.max_candidates ?? 3)));
    const candidates = possibilities.filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    }).slice(0, maxCandidates);

    return candidates.length ? { cluster, currentRole, candidates } : null;
  }

  function renderSoftPath(id) {
    const derived = deriveSoftPathCandidates(id);
    if (!derived) return '';
    const options = derived.candidates.map((candidate) => {
      const roleLabel = state.roleDefinitions?.[candidate.role]?.label ?? candidate.role;
      const reason = candidate.relation.note
        ? '「' + roleLabel + '」方向へ進む。' + candidate.relation.note
        : '「' + roleLabel + '」方向へ進む。' + candidate.relation.type + 'の関係で直接つながっている。';
      return '<button class="focus-next-option" type="button" data-focus-term="' + escapeHtml(candidate.id) + '">' +
        '<span class="focus-next-role">' + escapeHtml(roleLabel) + '</span>' +
        '<strong class="focus-next-name">' + escapeHtml(nameById(candidate.id)) + '</strong>' +
        '<span class="focus-next-reason">' + escapeHtml(reason) + '</span>' +
      '</button>';
    }).join('');

    return '<section class="focus-next" aria-label="次に見る候補">' +
      '<div class="focus-next-head">' +
        '<div><p class="focus-side-title">SOFT PATH PILOT · ' + escapeHtml(derived.cluster.label) + '</p><p class="focus-next-title">次に見るなら</p></div>' +
        '<p class="focus-next-hint">正解の順番ではなく、今の語から理解を進めやすい候補。</p>' +
      '</div>' +
      '<div class="focus-next-options">' + options + '</div>' +
    '</section>';
  }

  function renderFocus() {
    const item = itemById(state.focusId);
    if (!item) return;
    const names = displayNames(item);
    const outgoing = focusEdges('outgoing');
    const incoming = focusEdges('incoming');
    const essay = state.essays[state.focusId];
    const fields = (item.fields ?? []).slice(0, 3).map(fieldLabel).join(' / ');
    const clusterContext = clustersFor(state.focusId);

    focusCount.textContent = (incoming.length + outgoing.length) + 'の関係';
    focusMap.innerHTML =
      '<div class="focus-side" data-direction="incoming">' +
        '<p class="focus-side-title">この言葉へ入ってくる</p>' +
        (incoming.length ? incoming.map((edge) => renderEdge(edge, 'incoming')).join('') : '<p class="map-empty">入ってくる関係はまだありません。</p>') +
      '</div>' +
      '<article class="focus-center">' +
        '<p class="focus-center-fields">' + escapeHtml(fields) + '</p>' +
        (clusterContext.length ? '<p class="focus-center-fields" title="' + escapeHtml(clusterContext.map((cluster) => cluster.question).join(' / ')) + '">CONTEXT · ' + escapeHtml(clusterContext.map((cluster) => cluster.label).join(' / ')) + '</p>' : '') +
        '<h3 tabindex="-1">' + escapeHtml(names.primary) + '</h3>' +
        (names.secondary ? '<p class="focus-center-en">' + escapeHtml(names.secondary) + '</p>' : '') +
        '<p class="focus-center-copy">' + escapeHtml(essay?.question || item.one_liner || '') + '</p>' +
        '<div class="focus-center-actions">' +
          '<a href="./#term=' + encodeURIComponent(state.focusId) + '">意味を読む →</a>' +
          '<a href="./term.html?id=' + encodeURIComponent(state.focusId) + '">この言葉で考える →</a>' +
        '</div>' +
      '</article>' +
      '<div class="focus-side" data-direction="outgoing">' +
        '<p class="focus-side-title">この言葉から出ていく</p>' +
        (outgoing.length ? outgoing.map((edge) => renderEdge(edge, 'outgoing')).join('') : '<p class="map-empty">出ていく関係はまだありません。</p>') +
      '</div>' +
      renderSoftPath(state.focusId);
  }

  function families() {
    const definitions = relationGrammar?.families ?? {};
    return Object.entries(definitions).map(([id, definition]) => ({
      id,
      ...definition,
      count: state.edges.filter((edge) => edge.family === id).length,
    })).filter((family) => family.count > 0);
  }

  function renderVerbFilters() {
    verbFilters.innerHTML = families().map((family) => {
      const active = state.activeFamily === family.id;
      return '<button class="verb-chip' + (active ? ' is-active' : '') + '" type="button" data-family="' + escapeHtml(family.id) + '" aria-pressed="' + active + '" title="' + escapeHtml(family.description) + '">' + escapeHtml(family.label) + ' · ' + family.count + '</button>';
    }).join('');
    syncVerbFilters();
  }

  function syncVerbFilters() {
    verbFilters.querySelectorAll('[data-family]').forEach((button) => {
      const active = button.dataset.family === state.activeFamily;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    clearVerb.hidden = !state.activeFamily;
  }

  function renderRoutes() {
    const routes = state.activeFamily ? state.edges.filter((edge) => edge.family === state.activeFamily) : state.edges;
    routeList.innerHTML = routes.length ? routes.map((edge) =>
      '<div class="route-row" data-relation-kind="' + escapeHtml(String(edge.kind || 'NEAR').toLowerCase()) + '"' + familyAttribute(edge) + '>' +
        '<button class="route-term" type="button" data-focus-term="' + escapeHtml(edge.source) + '">' + escapeHtml(nameById(edge.source)) + '</button>' +
        '<span class="route-verb">' + escapeHtml(edge.verb) + ' →</span>' +
        '<button class="route-term" type="button" data-focus-term="' + escapeHtml(edge.target) + '">' + escapeHtml(nameById(edge.target)) + '</button>' +
      '</div>'
    ).join('') : '<p class="map-empty">該当する関係はありません。</p>';
  }

  function renderSearch() {
    const query = String(searchInput.value || '').trim().toLocaleLowerCase('ja');
    if (!query) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      return;
    }
    const matches = [...state.items.values()].map(applyCatalog).filter((item) => {
      const names = displayNames(item);
      const text = [names.primary, names.secondary, item.one_liner, ...(item.aliases ?? [])].join(' ').toLocaleLowerCase('ja');
      return text.includes(query);
    }).slice(0, 8);

    searchResults.hidden = false;
    searchResults.innerHTML = matches.length ? matches.map((item) => {
      const names = displayNames(item);
      return '<button class="map-search-result" type="button" data-focus-term="' + escapeHtml(item.id) + '">' +
        '<span>' + escapeHtml(names.primary) + '</span>' +
        '<small>' + escapeHtml(names.secondary || (item.fields ?? []).slice(0, 2).map(fieldLabel).join(' / ')) + '</small>' +
      '</button>';
    }).join('') : '<p class="map-empty" style="padding:12px 14px">見つかりませんでした。</p>';
  }

  function focusFromEvent(event) {
    const target = event.target.closest('[data-focus-term]');
    if (!target) return false;
    const keyboardActivation = event.detail === 0;
    event.preventDefault();
    setFocus(target.dataset.focusTerm, { historyMode: 'push' });
    searchInput.value = '';
    searchResults.hidden = true;
    scrollFocusMap();
    if (keyboardActivation) {
      requestAnimationFrame(() => {
        focusMap.querySelector('.focus-center h3')?.focus({ preventScroll: true });
      });
    }
    return true;
  }

  searchInput.addEventListener('input', renderSearch);
  searchResults.addEventListener('click', focusFromEvent);
  focusMap.addEventListener('click', focusFromEvent);
  routeList.addEventListener('click', focusFromEvent);

  verbFilters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-family]');
    if (!button) return;
    state.activeFamily = state.activeFamily === button.dataset.family ? null : button.dataset.family;
    syncVerbFilters();
    renderRoutes();
  });

  clearVerb.addEventListener('click', () => {
    const previousFamily = state.activeFamily;
    state.activeFamily = null;
    syncVerbFilters();
    renderRoutes();
    if (previousFamily) {
      requestAnimationFrame(() => {
        const previousButton = [...verbFilters.querySelectorAll('[data-family]')]
          .find((button) => button.dataset.family === previousFamily);
        previousButton?.focus({ preventScroll: true });
      });
    }
  });

  randomFocus.addEventListener('click', () => {
    const ids = [...state.items.keys()];
    if (!ids.length) return;
    setFocus(ids[Math.floor(Math.random() * ids.length)], { historyMode: 'push' });
  });

  window.addEventListener('popstate', () => {
    const id = focusIdFromLocation();
    if (id) setFocus(id, { updateUrl: false });
  });

  async function init() {
    try {
      const [catalog, essayIndex, clusterData] = await Promise.all([
        loadJson('data/catalog.json'),
        loadJson('data/essay-index.json'),
        loadJson('data/clusters.json'),
      ]);
      state.catalog = catalog;
      state.clusters = Array.isArray(clusterData?.clusters) ? clusterData.clusters : [];
      state.roleDefinitions = clusterData?.role_grammar?.roles ?? {};
      state.softPathPilot = clusterData?.soft_path_pilot ?? null;
      const datasets = catalog.datasets ?? ['data/vocabularies.json'];
      const relationDatasets = catalog.relation_datasets ?? [];
      const [collections, essays, relationCollections] = await Promise.all([
        Promise.all(datasets.map(loadJson)),
        loadEssayMap(essayIndex),
        Promise.all(relationDatasets.map(loadJson)),
      ]);
      collections.flat().forEach((item) => { if (item?.id) state.items.set(item.id, item); });
      state.essays = essays;
      state.edges = buildEdges();
      state.typedEdges = buildTypedEdges(relationCollections);

      const requested = new URLSearchParams(window.location.search).get('term');
      initialFocusId = requested && state.items.has(requested)
        ? requested
        : (state.items.has('differentiation') ? 'differentiation' : [...state.items.keys()][0]);

      setFocus(initialFocusId, { updateUrl: false });
      renderVerbFilters();
      renderRoutes();
    } catch (error) {
      console.error(error);
      focusMap.innerHTML = '<p class="map-empty">概念地図の読み込みに失敗しました。</p>';
      focusCount.textContent = '読み込み失敗';
    }
  }

  init();
})();