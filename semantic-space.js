(() => {
  const summary = document.querySelector('#spaceSummary');
  const nextDirections = document.querySelector('#nextDirections');
  const frontierGrid = document.querySelector('#frontierGrid');
  const densityGrid = document.querySelector('#densityGrid');
  const fieldBalance = document.querySelector('#fieldBalance');
  const debtMethod = document.querySelector('#debtMethod');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

  async function loadJson(path) {
    const response = await fetch('./' + String(path).replace(/^\.\//, ''), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function dateFromPath(path) {
    const match = String(path).match(/(20\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function mergeItems(records, catalog) {
    const map = new Map();
    for (const record of records) {
      const sourceDate = dateFromPath(record.path);
      for (const item of record.data ?? []) {
        if (!item?.id) continue;
        map.set(item.id, {
          ...(catalog.defaults ?? {}),
          ...item,
          ...(catalog.terms?.[item.id] ?? {}),
          _dataset_path: record.path,
          _dataset_date: sourceDate,
        });
      }
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

  function itemText(item, catalog) {
    const fields = (item.fields ?? []).flatMap((field) => [field, catalog.field_labels?.[field] ?? '']);
    return [
      item.id,
      item.term,
      item.ja,
      item.one_liner,
      item.description,
      item.usage_note,
      ...(item.aliases ?? []),
      ...fields,
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function daysSince(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return Math.max(0, (Date.now() - date.getTime()) / 86400000);
  }

  function debtModel(data, model) {
    const config = data.semanticCatalog.exploration_debt ?? {};
    const weights = {
      priority: 0.25,
      scarcity: 0.35,
      recency: 0.25,
      adjacent_saturation: 0.15,
      ...(config.weights ?? {}),
    };
    const fullDebtDays = Number(config.recency_full_debt_days ?? 30);
    const pressure = config.status_pressure ?? { cooldown: 100, dense: 90, watch: 65, balanced: 25 };
    const clustersById = new Map((data.registry.clusters ?? []).map((cluster) => [cluster.id, cluster]));
    const itemTexts = new Map([...data.items].map(([id, item]) => [id, itemText(item, data.catalog)]));

    return (data.registry.frontiers ?? []).map((frontier) => {
      const signals = (config.frontier_signals?.[frontier.id] ?? frontier.target_domains ?? [])
        .map((signal) => String(signal).toLowerCase().trim())
        .filter(Boolean);
      const matched = [...data.items.values()].filter((item) => {
        const text = itemTexts.get(item.id) ?? '';
        return signals.some((signal) => text.includes(signal));
      });
      const dates = matched.map((item) => item._dataset_date).filter(Boolean).sort((a, b) => b - a);
      const latestDate = dates[0] ?? null;
      const ageDays = daysSince(latestDate);

      const priority = clamp(130 - Number(frontier.priority ?? 3) * 30);
      const scarcity = clamp(100 / (1 + matched.length * 0.55));
      const recency = latestDate ? clamp((ageDays / fullDebtDays) * 100) : 100;
      const adjacent = (frontier.avoid_clusters ?? [])
        .map((id) => pressure[clustersById.get(id)?.status] ?? 0);
      const adjacentSaturation = adjacent.length
        ? adjacent.reduce((sum, value) => sum + value, 0) / adjacent.length
        : 35;
      const score = clamp(
        priority * weights.priority +
        scarcity * weights.scarcity +
        recency * weights.recency +
        adjacentSaturation * weights.adjacent_saturation
      );

      return {
        ...frontier,
        debt: Math.round(score),
        matchedCount: matched.length,
        latestDate,
        ageDays,
        components: {
          priority: Math.round(priority),
          scarcity: Math.round(scarcity),
          recency: Math.round(recency),
          adjacentSaturation: Math.round(adjacentSaturation),
        },
      };
    });
  }

  function debtBand(score) {
    if (score >= 75) return '高';
    if (score >= 55) return '中';
    return '低';
  }

  function frontierCard(frontier, featured = false) {
    const domains = (frontier.target_domains ?? []).map((domain) => `<span>${escapeHtml(domain)}</span>`).join('');
    const avoids = (frontier.avoid_clusters ?? []).map((id) => `<span>${escapeHtml(id)}</span>`).join('');
    const latest = frontier.latestDate
      ? frontier.latestDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
      : '近接語なし';
    return `
      <article class="frontier-card${featured ? ' is-featured' : ''}" data-debt="${frontier.debt}">
        <div class="card-topline">
          <div class="card-pills">
            <span class="pill pill-${escapeHtml(frontier.mode)}">${escapeHtml(modeLabel(frontier.mode))}</span>
            <span class="pill debt-band">負債 ${escapeHtml(debtBand(frontier.debt))}</span>
          </div>
          <span class="debt-score"><strong>${frontier.debt}</strong><small>/100</small></span>
        </div>
        <h3>${escapeHtml(frontier.label)}</h3>
        <p class="frontier-question">${escapeHtml(frontier.question)}</p>
        <p class="frontier-why">${escapeHtml(frontier.why_open)}</p>
        <div class="debt-breakdown" aria-label="探索負債の内訳">
          <span title="既存の近接語が少ないほど高い">薄さ <strong>${frontier.components.scarcity}</strong></span>
          <span title="近接語の最終追加から時間が空くほど高い">放置 <strong>${frontier.components.recency}</strong></span>
          <span title="避ける隣接クラスタが飽和しているほど高い">隣接飽和 <strong>${frontier.components.adjacentSaturation}</strong></span>
        </div>
        <p class="coverage-proxy">近接シグナル ${frontier.matchedCount}語 · 最終 ${escapeHtml(latest)}</p>
        <div class="domain-list">${domains}</div>
        ${avoids ? `<div class="avoid-list">${avoids}</div>` : ''}
      </article>
    `;
  }

  function chooseNext(scored, config) {
    const sorted = [...scored].sort((a, b) => b.debt - a.debt || a.priority - b.priority || a.label.localeCompare(b.label, 'ja'));
    const count = Number(config?.featured_count ?? 3);
    if (!config?.ensure_mode_diversity || count < 2) return sorted.slice(0, count);

    const picked = [];
    if (sorted[0]) picked.push(sorted[0]);
    const desiredModes = ['practical', 'distant', 'hybrid'];
    for (const mode of desiredModes) {
      if (picked.length >= count) break;
      if (picked.some((item) => item.mode === mode)) continue;
      const match = sorted.find((item) => item.mode === mode && !picked.includes(item));
      if (match) picked.push(match);
    }
    for (const item of sorted) {
      if (picked.length >= count) break;
      if (!picked.includes(item)) picked.push(item);
    }
    return picked;
  }

  async function loadAll() {
    const [catalog, semanticCatalog, registry, governance, studyClusters] = await Promise.all([
      loadJson('data/catalog.json'),
      loadJson('data/semantic-catalog.json'),
      loadJson('data/semantic-clusters.json'),
      loadJson('data/semantic-governance.json'),
      loadJson('data/clusters.json'),
    ]);

    const datasetPaths = catalog.datasets ?? [];
    const [datasetResults, annotationResults] = await Promise.all([
      Promise.all(datasetPaths.map(async (path) => ({ path, data: await loadJson(path) }))),
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
    const frontiers = debtModel(data, model);
    const debtConfig = data.semanticCatalog.exploration_debt ?? {};
    const total = data.items.size;
    const coveredTerms = new Set();
    for (const ids of model.membership.values()) for (const id of ids) coveredTerms.add(id);
    const highestDebt = Math.max(0, ...frontiers.map((frontier) => frontier.debt));

    summary.innerHTML = `
      <div class="summary-card"><strong>${total}</strong><span>全語彙</span></div>
      <div class="summary-card"><strong>${model.axisIds.size}</strong><span>観察軸を明示</span></div>
      <div class="summary-card"><strong>${frontiers.length}</strong><span>開いているFrontier</span></div>
      <div class="summary-card"><strong>${highestDebt}</strong><span>最大探索負債 / 100</span></div>
    `;

    const selected = chooseNext(frontiers, debtConfig);
    nextDirections.innerHTML = selected.map((frontier, index) => frontierCard(frontier, index === 0)).join('');
    frontierGrid.innerHTML = [...frontiers]
      .sort((a, b) => b.debt - a.debt || a.priority - b.priority || a.label.localeCompare(b.label, 'ja'))
      .map((frontier) => frontierCard(frontier))
      .join('');

    if (debtMethod) {
      const weights = debtConfig.weights ?? {};
      debtMethod.innerHTML = `探索負債 = 優先度 ${Math.round((weights.priority ?? .25) * 100)}% + 薄さ ${Math.round((weights.scarcity ?? .35) * 100)}% + 放置期間 ${Math.round((weights.recency ?? .25) * 100)}% + 隣接領域の飽和 ${Math.round((weights.adjacent_saturation ?? .15) * 100)}%。これは自動採用点ではなく、候補探索の順番を決める編集補助です。`;
    }

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
