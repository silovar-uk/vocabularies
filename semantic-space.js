(() => {
  const summary = document.querySelector('#spaceSummary');
  const nextDirections = document.querySelector('#nextDirections');
  const frontierGrid = document.querySelector('#frontierGrid');
  const densityGrid = document.querySelector('#densityGrid');
  const fieldBalance = document.querySelector('#fieldBalance');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function loadJson(path) {
    const response = await fetch('./' + String(path).replace(/^\.\//, ''), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function mergeItems(collections, catalog) {
    const map = new Map();
    for (const item of collections.flat()) {
      if (!item?.id) continue;
      map.set(item.id, {
        ...(catalog.defaults ?? {}),
        ...item,
        ...(catalog.terms?.[item.id] ?? {}),
      });
    }
    return map;
  }

  function mergeAnnotations(base, sources) {
    const merged = { ...(base?.term_annotations ?? {}) };
    for (const source of sources) {
      for (const [id, annotation] of Object.entries(source?.term_annotations ?? {})) {
        merged[id] = { ...(merged[id] ?? {}), ...annotation };
      }
    }
    return merged;
  }

  function modeLabel(mode) {
    if (mode === 'practical') return '実務';
    if (mode === 'distant') return '遠距離';
    return '混合';
  }

  function statusLabel(status, registry) {
    return registry.status_labels?.[status] ?? status;
  }

  function frontierCard(frontier, featured = false) {
    const domains = (frontier.target_domains ?? []).map((domain) => `<span>${escapeHtml(domain)}</span>`).join('');
    const avoids = (frontier.avoid_clusters ?? []).map((id) => `<span>${escapeHtml(id)}</span>`).join('');
    return `
      <article class="frontier-card${featured ? ' is-featured' : ''}">
        <div class="card-topline">
          <span class="pill pill-${escapeHtml(frontier.mode)}">${escapeHtml(modeLabel(frontier.mode))}</span>
          <span class="priority">優先度 ${escapeHtml(frontier.priority)}</span>
        </div>
        <h3>${escapeHtml(frontier.label)}</h3>
        <p class="frontier-question">${escapeHtml(frontier.question)}</p>
        <p class="frontier-why">${escapeHtml(frontier.why_open)}</p>
        <div class="domain-list">${domains}</div>
        ${avoids ? `<div class="avoid-list">${avoids}</div>` : ''}
      </article>
    `;
  }

  function chooseNext(frontiers) {
    const sorted = [...frontiers].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label, 'ja'));
    const picked = [];
    for (const mode of ['practical', 'distant', 'hybrid']) {
      const match = sorted.find((item) => item.mode === mode && !picked.includes(item));
      if (match) picked.push(match);
    }
    for (const item of sorted) {
      if (picked.length >= 3) break;
      if (!picked.includes(item)) picked.push(item);
    }
    return picked.slice(0, 3);
  }

  async function loadAll() {
    const [catalog, semanticCatalog, registry, governance, studyClusters] = await Promise.all([
      loadJson('data/catalog.json'),
      loadJson('data/semantic-catalog.json'),
      loadJson('data/semantic-clusters.json'),
      loadJson('data/semantic-governance.json'),
      loadJson('data/clusters.json'),
    ]);

    const [datasetResults, annotationResults] = await Promise.all([
      Promise.all((catalog.datasets ?? []).map(loadJson)),
      Promise.all((semanticCatalog.annotation_datasets ?? []).map(loadJson)),
    ]);

    return {
      catalog,
      semanticCatalog,
      registry,
      governance,
      studyClusters,
      items: mergeItems(datasetResults, catalog),
      annotations: mergeAnnotations(governance, annotationResults),
    };
  }

  function buildModel(data) {
    const membership = new Map((data.registry.clusters ?? []).map((cluster) => [cluster.id, new Set()]));
    const add = (clusterId, termId) => {
      if (!clusterId || !termId) return;
      if (!membership.has(clusterId)) membership.set(clusterId, new Set());
      if (data.items.has(termId)) membership.get(clusterId).add(termId);
    };

    for (const cluster of data.studyClusters.clusters ?? []) {
      for (const id of cluster.members ?? []) add(cluster.id, id);
    }
    for (const [id, annotation] of Object.entries(data.annotations)) add(annotation.cluster, id);
    for (const cluster of data.governance.cooldown_clusters ?? []) {
      for (const id of cluster.terms ?? []) add(cluster.id, id);
    }

    const axisIds = new Set();
    for (const [id, annotation] of Object.entries(data.annotations)) {
      if (data.items.has(id) && String(annotation.axis ?? '').trim()) axisIds.add(id);
    }
    for (const [id, item] of data.items) {
      if (String(item.observation_axis ?? '').trim()) axisIds.add(id);
    }

    const fields = new Map();
    for (const item of data.items.values()) {
      for (const field of item.fields ?? []) fields.set(field, (fields.get(field) ?? 0) + 1);
    }

    return { membership, axisIds, fields };
  }

  function render(data, model) {
    const clusters = data.registry.clusters ?? [];
    const frontiers = data.registry.frontiers ?? [];
    const total = data.items.size;
    const coveredTerms = new Set();
    for (const ids of model.membership.values()) for (const id of ids) coveredTerms.add(id);

    summary.innerHTML = `
      <div class="summary-card"><strong>${total}</strong><span>全語彙</span></div>
      <div class="summary-card"><strong>${coveredTerms.size}</strong><span>意味クラスタ内</span></div>
      <div class="summary-card"><strong>${model.axisIds.size}</strong><span>観察軸を明示</span></div>
      <div class="summary-card"><strong>${frontiers.length}</strong><span>開いているFrontier</span></div>
    `;

    const selected = chooseNext(frontiers);
    nextDirections.innerHTML = selected.map((frontier, index) => frontierCard(frontier, index === 0)).join('');
    frontierGrid.innerHTML = [...frontiers]
      .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label, 'ja'))
      .map((frontier) => frontierCard(frontier))
      .join('');

    const statusWeight = { cooldown: 4, watch: 3, dense: 2, balanced: 1 };
    const clusterRows = clusters.map((cluster) => ({
      ...cluster,
      count: model.membership.get(cluster.id)?.size ?? 0,
    })).sort((a, b) => (statusWeight[b.status] ?? 0) - (statusWeight[a.status] ?? 0) || b.count - a.count);
    const maxClusterCount = Math.max(1, ...clusterRows.map((cluster) => cluster.count));

    densityGrid.innerHTML = clusterRows.map((cluster) => `
      <article class="density-card" data-status="${escapeHtml(cluster.status)}">
        <div class="card-topline">
          <span class="pill">${escapeHtml(statusLabel(cluster.status, data.registry))}</span>
          <span class="priority">${cluster.count}語</span>
        </div>
        <h3>${escapeHtml(cluster.label)}</h3>
        <p class="frontier-question">${escapeHtml(cluster.question)}</p>
        <p class="density-note">${escapeHtml(cluster.exploration_note)}</p>
        <div class="density-meta"><span>${escapeHtml(cluster.kind === 'learning' ? '学習クラスタ' : '監査クラスタ')}</span></div>
        <div class="density-track" aria-hidden="true"><span style="width:${Math.max(4, Math.round(cluster.count / maxClusterCount * 100))}%"></span></div>
      </article>
    `).join('');

    const fieldRows = [...model.fields.entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ja'));
    const maxField = Math.max(1, ...fieldRows.map(([, count]) => count));
    fieldBalance.innerHTML = fieldRows.map(([field, count]) => `
      <div class="field-row">
        <strong>${escapeHtml(data.catalog.field_labels?.[field] ?? field)}</strong>
        <div class="field-track" aria-hidden="true"><span style="width:${Math.round(count / maxField * 100)}%"></span></div>
        <em>${count}</em>
      </div>
    `).join('');
  }

  loadAll()
    .then((data) => render(data, buildModel(data)))
    .catch((error) => {
      console.error(error);
      summary.textContent = '語彙空間を読み込めませんでした。';
    });
})();
