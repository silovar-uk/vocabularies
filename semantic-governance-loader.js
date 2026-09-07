(() => {
  let governance = null;
  let clusterLabels = {};

  function annotationFor(id) {
    return governance?.term_annotations?.[id] ?? null;
  }

  function mergeAnnotation(item) {
    const annotation = annotationFor(item?.id);
    if (!annotation) return item;
    const nearest = [...new Set([
      ...(item.nearest_terms ?? []),
      ...(annotation.nearest_terms ?? []),
    ].filter(Boolean))];
    const clusterId = item.semantic_cluster || annotation.cluster || '';
    return {
      ...item,
      observation_axis: item.observation_axis || annotation.axis || '',
      semantic_cluster: clusterId,
      semantic_cluster_label: item.semantic_cluster_label || clusterLabels[clusterId] || '',
      nearest_terms: nearest,
    };
  }

  function mergeGovernance(base, annotationSources, semanticCatalog) {
    const termAnnotations = { ...(base?.term_annotations ?? {}) };
    for (const source of annotationSources) {
      for (const [id, annotation] of Object.entries(source?.term_annotations ?? {})) {
        termAnnotations[id] = { ...(termAnnotations[id] ?? {}), ...annotation };
      }
    }
    return {
      ...base,
      term_annotations: termAnnotations,
      addition_gate: semanticCatalog?.addition_gate ?? null,
      annotation_datasets: semanticCatalog?.annotation_datasets ?? [],
    };
  }

  function syncReaderSection() {
    const panel = document.querySelector('#readerContent');
    if (!panel || !state?.activeItemId) return;
    const item = state.items.find((entry) => entry.id === state.activeItemId);
    if (!item) return;

    let section = panel.querySelector('[data-semantic-governance]');
    if (!item.observation_axis && !item.semantic_cluster) {
      section?.remove();
      return;
    }

    if (!section) {
      section = document.createElement('section');
      section.className = 'reader-section reader-usage-note';
      section.dataset.semanticGovernance = 'true';
      const definition = panel.querySelector('.reader-definition');
      if (definition) definition.insertAdjacentElement('afterend', section);
      else panel.appendChild(section);
    }

    const clusterName = item.semantic_cluster_label || item.semantic_cluster;
    const cluster = clusterName
      ? `<span class="reader-field">${escapeHtml(clusterName)}</span>`
      : '';
    section.innerHTML = `
      <p class="reader-kicker">この語で見るもの</p>
      ${item.observation_axis ? `<p>${escapeHtml(item.observation_axis)}</p>` : ''}
      ${cluster ? `<div class="reader-fields">${cluster}</div>` : ''}
    `;
  }

  function applyGovernance() {
    if (!governance || !Array.isArray(state?.items)) return;
    state.semanticGovernance = governance;
    state.items = state.items.map(mergeAnnotation);
    window.vocabularyStudyItems = state.items;
    if (typeof render === 'function') render();
    requestAnimationFrame(syncReaderSection);
    window.dispatchEvent(new CustomEvent('vocabulary-semantic-metadata-ready', {
      detail: {
        count: Object.keys(governance.term_annotations ?? {}).length,
      },
    }));
  }

  async function load() {
    try {
      const [base, semanticCatalog] = await Promise.all([
        loadJson('data/semantic-governance.json'),
        loadJson('data/semantic-catalog.json'),
      ]);
      const [annotationSources, registry] = await Promise.all([
        Promise.all((semanticCatalog?.annotation_datasets ?? []).map(loadJson)),
        semanticCatalog?.cluster_registry ? loadJson(semanticCatalog.cluster_registry) : Promise.resolve({ clusters: [] }),
      ]);
      clusterLabels = Object.fromEntries((registry?.clusters ?? []).map((cluster) => [cluster.id, cluster.label]));
      governance = mergeGovernance(base, annotationSources, semanticCatalog);
      governance.cluster_registry = registry;
      applyGovernance();
    } catch (error) {
      console.error('Semantic governance data could not be loaded:', error);
    }
  }

  window.addEventListener('vocabulary-reader-changed', () => {
    requestAnimationFrame(syncReaderSection);
  });

  if (Array.isArray(window.vocabularyStudyItems) && window.vocabularyStudyItems.length) {
    load();
  } else {
    window.addEventListener('vocabulary-items-ready', load, { once: true });
  }
})();