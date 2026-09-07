(() => {
  const stats = document.querySelector('#auditStats');
  const meters = document.querySelector('#coverageMeters');
  const clusterCoverage = document.querySelector('#clusterCoverage');
  const clusters = document.querySelector('#cooldownClusters');
  const pairs = document.querySelector('#riskPairs');
  const axes = document.querySelector('#recentAxes');
  const unclassified = document.querySelector('#unclassifiedTerms');
  const integritySection = document.querySelector('#integritySection');
  const integrityWarnings = document.querySelector('#integrityWarnings');
  const principles = document.querySelector('#principles');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const jsonCache = new Map();

  async function loadJson(path) {
    const clean = String(path).replace(/^\.\//, '');
    if (jsonCache.has(clean)) return jsonCache.get(clean);
    const request = (async () => {
      const urls = [
        './' + clean,
        'https://raw.githubusercontent.com/silovar-uk/vocabularies/main/' + clean,
      ];
      let lastError;
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError ?? new Error(`Could not load ${clean}`);
    })();
    jsonCache.set(clean, request);
    try {
      return await request;
    } catch (error) {
      jsonCache.delete(clean);
      throw error;
    }
  }

  function mergeItems(collections, catalog) {
    const map = new Map();
    collections.flat().forEach((item) => {
      if (!item?.id) return;
      const metadata = catalog?.terms?.[item.id] ?? {};
      map.set(item.id, {
        ...(catalog?.defaults ?? {}),
        ...item,
        ...metadata,
      });
    });
    return map;
  }

  async function loadAll() {
    const [catalog, governance, clusterData] = await Promise.all([
      loadJson('data/catalog.json'),
      loadJson('data/semantic-governance.json'),
      loadJson('data/clusters.json'),
    ]);

    const paths = [...new Set(catalog.datasets ?? [])];
    const settled = await Promise.allSettled(paths.map(loadJson));
    const loaded = [];
    const failedDatasets = [];

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) loaded.push(result.value);
      else failedDatasets.push(paths[index]);
    });

    return {
      catalog,
      governance,
      clusterData,
      items: mergeItems(loaded, catalog),
      failedDatasets,
    };
  }

  function statusLabel(status) {
    return status === 'cooldown' ? 'クールダウン' : '要監視';
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function nameOf(item) {
    if (!item) return '';
    return item.ja || item.term || item.id;
  }

  function primaryField(item) {
    return item?.fields?.[0] || 'その他';
  }

  function buildAudit(data) {
    const itemIds = new Set(data.items.keys());
    const membership = new Map();
    const broken = [];

    const addMembership = (termId, clusterId, source) => {
      if (!itemIds.has(termId)) {
        broken.push({ source, term: termId });
        return;
      }
      if (!membership.has(termId)) membership.set(termId, new Set());
      membership.get(termId).add(clusterId);
    };

    const studyClusters = Array.isArray(data.clusterData?.clusters) ? data.clusterData.clusters : [];
    studyClusters.forEach((cluster) => {
      (cluster.members ?? []).forEach((termId) => addMembership(termId, cluster.id, `clusters.json / ${cluster.id}`));
    });

    const governanceClusters = data.governance?.cooldown_clusters ?? [];
    governanceClusters.forEach((cluster) => {
      (cluster.terms ?? []).forEach((termId) => addMembership(termId, cluster.id, `semantic-governance.json / ${cluster.id}`));
    });

    const annotations = data.governance?.term_annotations ?? {};
    Object.entries(annotations).forEach(([termId, annotation]) => {
      if (!itemIds.has(termId)) {
        broken.push({ source: 'term_annotations', term: termId });
        return;
      }
      if (annotation.cluster) addMembership(termId, annotation.cluster, 'term_annotations');
      (annotation.nearest_terms ?? []).forEach((nearId) => {
        if (!itemIds.has(nearId)) broken.push({ source: `nearest_terms / ${termId}`, term: nearId });
      });
    });

    (data.governance?.high_risk_pairs ?? []).forEach((pair) => {
      if (!itemIds.has(pair.a)) broken.push({ source: 'high_risk_pairs', term: pair.a });
      if (!itemIds.has(pair.b)) broken.push({ source: 'high_risk_pairs', term: pair.b });
    });

    (data.governance?.recent_axes ?? []).forEach((entry) => {
      if (!itemIds.has(entry.term)) broken.push({ source: 'recent_axes', term: entry.term });
    });

    const explicitAxisIds = new Set();
    for (const [id, item] of data.items.entries()) {
      if (String(item.observation_axis ?? '').trim()) explicitAxisIds.add(id);
    }
    Object.keys(annotations).forEach((id) => {
      if (itemIds.has(id) && String(annotations[id]?.axis ?? '').trim()) explicitAxisIds.add(id);
    });
    (data.governance?.recent_axes ?? []).forEach((entry) => {
      if (itemIds.has(entry.term) && String(entry.axis ?? '').trim()) explicitAxisIds.add(entry.term);
    });

    const uniqueBroken = [...new Map(
      broken.map((entry) => [`${entry.source}|${entry.term}`, entry])
    ).values()];

    const allItems = [...data.items.values()];
    const unclassifiedItems = allItems.filter((item) => !membership.has(item.id));

    const combinedClusters = studyClusters.map((cluster) => {
      const validMembers = (cluster.members ?? []).filter((id) => itemIds.has(id));
      return {
        ...cluster,
        source: 'study',
        validMembers,
        missingMembers: (cluster.members ?? []).filter((id) => !itemIds.has(id)),
      };
    });

    governanceClusters.forEach((cluster) => {
      if (combinedClusters.some((entry) => entry.id === cluster.id)) return;
      const validMembers = (cluster.terms ?? []).filter((id) => itemIds.has(id));
      combinedClusters.push({
        id: cluster.id,
        label: cluster.label,
        question: cluster.reason,
        description: cluster.reason,
        source: 'governance',
        status: cluster.status,
        validMembers,
        missingMembers: (cluster.terms ?? []).filter((id) => !itemIds.has(id)),
      });
    });

    combinedClusters.sort((a, b) =>
      b.validMembers.length - a.validMembers.length ||
      String(a.label).localeCompare(String(b.label), 'ja')
    );

    return {
      total: allItems.length,
      membership,
      classifiedCount: membership.size,
      explicitAxisIds,
      unclassifiedItems,
      combinedClusters,
      broken: uniqueBroken,
    };
  }

  function meter(label, value, total) {
    const percent = pct(value, total);
    return `
      <div class="coverage-meter">
        <div class="coverage-meter-head">
          <span>${escapeHtml(label)}</span>
          <strong>${value} / ${total} · ${percent}%</strong>
        </div>
        <div class="coverage-track" aria-hidden="true"><span style="width:${percent}%"></span></div>
      </div>
    `;
  }

  function renderClusterCard(cluster, items, options = {}) {
    const names = cluster.validMembers.map((id) => nameOf(items.get(id)) || id);
    const status = options.status ?? cluster.status ?? (cluster.validMembers.length >= 5 ? 'dense' : 'normal');
    const statusText = status === 'dense'
      ? '厚い'
      : status === 'cooldown'
        ? 'クールダウン'
        : status === 'watch'
          ? '要監視'
          : '整理済み';
    return `
      <article class="cluster-card" data-status="${escapeHtml(status)}">
        <div class="cluster-topline">
          <span class="status-pill">${escapeHtml(statusText)}</span>
          <span class="term-count">${cluster.validMembers.length}語</span>
        </div>
        <h3>${escapeHtml(cluster.label)}</h3>
        <p>${escapeHtml(cluster.question || cluster.description || '')}</p>
        <div class="term-cloud">${cluster.validMembers.map((id, index) =>
          `<a href="./#${encodeURIComponent(id)}"><code title="${escapeHtml(id)}">${escapeHtml(names[index])}</code></a>`
        ).join('')}</div>
      </article>
    `;
  }

  function render(data, audit) {
    const total = audit.total;
    const classified = audit.classifiedCount;
    const axesCount = audit.explicitAxisIds.size;
    const unclassifiedCount = audit.unclassifiedItems.length;
    const brokenCount = audit.broken.length + data.failedDatasets.length;

    stats.innerHTML = `
      <div><strong>${total}</strong><span>全語彙</span></div>
      <div><strong>${pct(classified, total)}%</strong><span>クラスタ被覆</span></div>
      <div><strong>${axesCount}</strong><span>観察軸を明示</span></div>
      <div><strong>${unclassifiedCount}</strong><span>未分類</span></div>
      <div><strong>${brokenCount}</strong><span>参照・読込警告</span></div>
    `;

    meters.innerHTML = [
      meter('意味クラスタ', classified, total),
      meter('観察軸の明示', axesCount, total),
    ].join('');

    clusterCoverage.innerHTML = audit.combinedClusters.length
      ? audit.combinedClusters.map((cluster) => renderClusterCard(cluster, data.items)).join('')
      : '<p class="empty-copy">クラスタデータはまだありません。</p>';

    const cooldown = (data.governance?.cooldown_clusters ?? []).map((cluster) => ({
      ...cluster,
      validMembers: (cluster.terms ?? []).filter((id) => data.items.has(id)),
    })).filter((cluster) => cluster.validMembers.length);

    clusters.innerHTML = cooldown.length
      ? cooldown.map((cluster) => renderClusterCard(cluster, data.items, { status: cluster.status })).join('')
      : '<p class="empty-copy">現在クールダウン中のクラスタはありません。</p>';

    const validPairs = (data.governance?.high_risk_pairs ?? []).filter(
      (pair) => data.items.has(pair.a) && data.items.has(pair.b)
    );
    pairs.innerHTML = validPairs.length
      ? validPairs.map((pair) => `
        <article class="pair-row">
          <div class="pair-names">
            <a href="./#${encodeURIComponent(pair.a)}"><code>${escapeHtml(nameOf(data.items.get(pair.a)) || pair.a)}</code></a>
            <span>↔</span>
            <a href="./#${encodeURIComponent(pair.b)}"><code>${escapeHtml(nameOf(data.items.get(pair.b)) || pair.b)}</code></a>
          </div>
          <p>${escapeHtml(pair.note)}</p>
        </article>
      `).join('')
      : '<p class="empty-copy">要注意の近接ペアは登録されていません。</p>';

    const recentAxes = (data.governance?.recent_axes ?? []).filter((entry) => data.items.has(entry.term));
    axes.innerHTML = recentAxes.length
      ? recentAxes.map((item) => `
        <article class="axis-row">
          <a href="./#${encodeURIComponent(item.term)}"><code>${escapeHtml(nameOf(data.items.get(item.term)) || item.term)}</code></a>
          <p>${escapeHtml(item.axis)}</p>
        </article>
      `).join('')
      : '<p class="empty-copy">直近の観察軸はまだ記録されていません。</p>';

    const byField = new Map();
    audit.unclassifiedItems.forEach((item) => {
      const field = primaryField(item);
      if (!byField.has(field)) byField.set(field, []);
      byField.get(field).push(item);
    });
    const fieldLabel = (field) => data.catalog?.field_labels?.[field] ?? field;
    const grouped = [...byField.entries()].sort((a, b) =>
      b[1].length - a[1].length || fieldLabel(a[0]).localeCompare(fieldLabel(b[0]), 'ja')
    );

    unclassified.innerHTML = grouped.length
      ? grouped.map(([field, items]) => `
        <details class="unclassified-group">
          <summary>
            <span>${escapeHtml(fieldLabel(field))}</span>
            <strong>${items.length}語</strong>
          </summary>
          <div class="term-cloud term-cloud-large">
            ${items.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ja')).map((item) =>
              `<a href="./#${encodeURIComponent(item.id)}"><code title="${escapeHtml(item.id)}">${escapeHtml(nameOf(item))}</code></a>`
            ).join('')}
          </div>
        </details>
      `).join('')
      : '<p class="empty-copy">すべての語が意味地図に入っています。</p>';

    const warnings = [
      ...data.failedDatasets.map((path) => ({ source: 'dataset load', term: path })),
      ...audit.broken,
    ];
    if (warnings.length) {
      integritySection.hidden = false;
      integrityWarnings.innerHTML = warnings.map((warning) => `
        <div class="integrity-row">
          <code>${escapeHtml(warning.term)}</code>
          <span>${escapeHtml(warning.source)}</span>
        </div>
      `).join('');
    } else {
      integritySection.hidden = true;
      integrityWarnings.innerHTML = '';
    }

    principles.textContent = (data.governance?.principles ?? []).join(' ／ ');
  }

  loadAll()
    .then((data) => {
      const audit = buildAudit(data);
      render(data, audit);
    })
    .catch((error) => {
      console.error(error);
      stats.textContent = '監査データを読み込めませんでした。';
    });
})();
