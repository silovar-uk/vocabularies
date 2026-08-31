(() => {
  const grid = document.querySelector('#vocabularyGrid');
  if (!(grid instanceof HTMLElement)) return;

  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
  let persistentId = null;
  let relationMap = {};
  let relationLoadStarted = false;

  const RELATION_GRAMMAR = [
    {
      id: 'signal',
      label: '兆候',
      symbol: '!',
      pattern: /兆候|きっかけ|入口|問題化/,
    },
    {
      id: 'contrast',
      label: '区別',
      symbol: '↔',
      pattern: /対概念|区別|比較|対照|混同|緊張|トレードオフ|区切り|事前|事後|トップダウン|カテゴリー化/,
    },
    {
      id: 'structure',
      label: '構成',
      symbol: '+',
      pattern: /構成|内訳|構造|要素|使用の層|成立原理|基盤/,
    },
    {
      id: 'flow',
      label: '作用',
      symbol: '→',
      pattern: /改善|手段|対応|影響|支え|補完|応用|適用|実行|評価|安全網|探索|予測|調整|実現|負担|支援|最初の一手/,
    },
    {
      id: 'near',
      label: '近接',
      symbol: '≈',
      pattern: /.*/,
    },
  ];

  function items() {
    return Array.isArray(window.vocabularyStudyItems) ? window.vocabularyStudyItems : [];
  }

  function itemMap() {
    return new Map(items().map((item) => [item.id, item]));
  }

  function mergeRelationMaps(maps) {
    const merged = {};
    for (const map of maps) {
      for (const [sourceId, edges] of Object.entries(map ?? {})) {
        if (!Array.isArray(edges)) continue;
        const byTarget = new Map((merged[sourceId] ?? []).map((edge) => [edge.id, edge]));
        for (const edge of edges) {
          if (edge?.id) byTarget.set(edge.id, edge);
        }
        merged[sourceId] = [...byTarget.values()];
      }
    }
    return merged;
  }

  function classifyRelation(type) {
    const value = String(type || '関連');
    return RELATION_GRAMMAR.find((entry) => entry.pattern.test(value)) ?? RELATION_GRAMMAR.at(-1);
  }

  function outgoingRelations(id, map) {
    const typed = relationMap[id];
    if (Array.isArray(typed) && typed.length) return typed;
    const item = map.get(id);
    return (item?.related ?? []).map((relatedId) => ({ id: relatedId, type: '関連', note: '' }));
  }

  function neighborhood(id) {
    const map = itemMap();
    const origin = map.get(id);
    if (!origin) return [];

    const peers = new Map();
    for (const edge of outgoingRelations(id, map)) {
      if (!map.has(edge.id) || edge.id === id) continue;
      peers.set(edge.id, { ...edge, direction: 'outgoing' });
    }

    for (const sourceId of map.keys()) {
      if (sourceId === id) continue;
      const incoming = outgoingRelations(sourceId, map).find((edge) => edge.id === id);
      if (!incoming) continue;
      if (peers.has(sourceId)) {
        peers.get(sourceId).reciprocal = true;
        continue;
      }
      peers.set(sourceId, { ...incoming, direction: 'incoming' });
    }

    return [...peers.entries()].map(([peerId, relation]) => ({ id: peerId, ...relation }));
  }

  function relationSymbol(relation, grammar) {
    if (grammar.id !== 'flow') return grammar.symbol;
    if (relation.reciprocal) return '↔';
    return relation.direction === 'incoming' ? '←' : '→';
  }

  function clearClasses() {
    grid.classList.remove('has-semantic-focus');
    grid.removeAttribute('data-semantic-origin');
    grid.querySelectorAll('.is-relation-origin, .is-related-peer, [data-relation-kind]').forEach((card) => {
      card.classList.remove('is-relation-origin', 'is-related-peer');
      card.removeAttribute('data-relation-kind');
      card.removeAttribute('data-relation-symbol');
      card.removeAttribute('data-relation-direction');
      card.removeAttribute('aria-description');
    });
  }

  function activate(id) {
    clearClasses();
    if (!id) return;

    const map = itemMap();
    const originItem = map.get(id);
    const origin = document.getElementById(id);
    if (!originItem || !(origin instanceof HTMLElement) || !origin.classList.contains('vocab-card')) return;

    origin.classList.add('is-relation-origin');
    grid.classList.add('has-semantic-focus');
    grid.dataset.semanticOrigin = id;

    const originName = typeof displayNames === 'function' ? displayNames(originItem).primary : originItem.ja || originItem.term || id;

    for (const relation of neighborhood(id)) {
      const card = document.getElementById(relation.id);
      if (!(card instanceof HTMLElement) || !card.classList.contains('vocab-card')) continue;

      const grammar = classifyRelation(relation.type);
      const symbol = relationSymbol(relation, grammar);
      card.classList.add('is-related-peer');
      card.dataset.relationKind = grammar.id;
      card.dataset.relationSymbol = symbol;
      card.dataset.relationDirection = relation.direction;
      card.setAttribute('aria-description', `${originName}との関係: ${relation.type || grammar.label}`);
    }
  }

  function restorePersistent() {
    if (persistentId) activate(persistentId);
    else clearClasses();
  }

  async function loadRelations() {
    if (relationLoadStarted) return;
    relationLoadStarted = true;
    const paths = state.catalog.relation_datasets?.length ? state.catalog.relation_datasets : ['data/relations.json'];
    try {
      const maps = await Promise.all(paths.map(async (path) => {
        const data = await loadJson(path);
        if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error(`${path} is not an object`);
        return data;
      }));
      relationMap = mergeRelationMaps(maps);
      const activeId = persistentId || grid.dataset.semanticOrigin;
      if (activeId) activate(activeId);
      document.body.classList.add('semantic-relations-ready');
    } catch (error) {
      console.error('Semantic relation data could not be loaded:', error);
    }
  }

  if (hoverCapable.matches) {
    grid.addEventListener('pointerover', (event) => {
      const card = event.target instanceof Element ? event.target.closest('.vocab-card') : null;
      if (!(card instanceof HTMLElement)) return;
      const from = event.relatedTarget;
      if (from instanceof Node && card.contains(from)) return;
      activate(card.id);
    });

    grid.addEventListener('pointerout', (event) => {
      const card = event.target instanceof Element ? event.target.closest('.vocab-card') : null;
      if (!(card instanceof HTMLElement)) return;
      const to = event.relatedTarget;
      if (to instanceof Node && card.contains(to)) return;
      restorePersistent();
    });
  }

  grid.addEventListener('focusin', (event) => {
    const card = event.target instanceof Element ? event.target.closest('.vocab-card') : null;
    if (card instanceof HTMLElement) activate(card.id);
  });

  grid.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (grid.contains(document.activeElement) && document.activeElement instanceof Element) {
        const card = document.activeElement.closest('.vocab-card');
        if (card instanceof HTMLElement) {
          activate(card.id);
          return;
        }
      }
      restorePersistent();
    });
  });

  window.addEventListener('vocabulary-reader-changed', (event) => {
    persistentId = event.detail?.id || null;
    restorePersistent();
  });

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.type === 'childList')) return;
    if (persistentId) requestAnimationFrame(() => activate(persistentId));
  });
  observer.observe(grid, { childList: true });

  window.VocabularySemanticIndex = Object.freeze({
    classify: (type) => {
      const grammar = classifyRelation(type);
      return { id: grammar.id, label: grammar.label, symbol: grammar.symbol };
    },
  });

  if (items().length) loadRelations();
  else window.addEventListener('vocabulary-items-ready', loadRelations, { once: true });

  document.body.classList.add('semantic-index-ready');
})();