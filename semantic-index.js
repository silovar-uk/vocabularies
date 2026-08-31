(() => {
  const grid = document.querySelector('#vocabularyGrid');
  if (!(grid instanceof HTMLElement)) return;

  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
  let persistentId = null;

  function items() {
    return Array.isArray(window.vocabularyStudyItems) ? window.vocabularyStudyItems : [];
  }

  function itemMap() {
    return new Map(items().map((item) => [item.id, item]));
  }

  function neighborhood(id) {
    const map = itemMap();
    const origin = map.get(id);
    if (!origin) return [];

    const ids = new Set(origin.related ?? []);
    for (const item of map.values()) {
      if ((item.related ?? []).includes(id)) ids.add(item.id);
    }
    ids.delete(id);
    return [...ids];
  }

  function clearClasses() {
    grid.classList.remove('has-semantic-focus');
    grid.removeAttribute('data-semantic-origin');
    grid.querySelectorAll('.is-relation-origin, .is-related-peer').forEach((card) => {
      card.classList.remove('is-relation-origin', 'is-related-peer');
    });
  }

  function activate(id) {
    clearClasses();
    if (!id) return;

    const origin = document.getElementById(id);
    if (!(origin instanceof HTMLElement) || !origin.classList.contains('vocab-card')) return;

    origin.classList.add('is-relation-origin');
    grid.classList.add('has-semantic-focus');
    grid.dataset.semanticOrigin = id;

    for (const relatedId of neighborhood(id)) {
      const card = document.getElementById(relatedId);
      if (card instanceof HTMLElement && card.classList.contains('vocab-card')) {
        card.classList.add('is-related-peer');
      }
    }
  }

  function restorePersistent() {
    if (persistentId) activate(persistentId);
    else clearClasses();
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

  document.body.classList.add('semantic-index-ready');
})();
