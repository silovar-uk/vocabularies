(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function injectPerceptionStyles() {
    const existing = document.querySelector('link[data-perception-system]');
    if (existing) return existing;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './perception-system.css?v=20260831-1445';
    link.dataset.perceptionSystem = 'true';
    document.head.appendChild(link);
    return link;
  }

  const perceptionStyles = injectPerceptionStyles();

  function replayClass(element, className) {
    if (!(element instanceof HTMLElement) || reducedMotion.matches) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function removeAfter(element, className, delay = 220) {
    window.setTimeout(() => element?.classList.remove(className), delay);
  }

  function armPerceptionIdentity() {
    const body = document.body;
    if (!body || body.dataset.perceptionIdentity === 'ready') return;
    body.dataset.perceptionIdentity = 'ready';

    const hero = document.querySelector('.hero-quiet');
    const heroCopy = hero?.querySelector('.hero-copy');
    const eyebrow = heroCopy?.querySelector('.eyebrow');
    const title = heroCopy?.querySelector('h1');
    const lead = heroCopy?.querySelector('.lead');

    if (hero instanceof HTMLElement) hero.dataset.motionMeaning = 'focus';

    if (eyebrow instanceof HTMLElement) {
      eyebrow.textContent = 'WORDS SHARPEN PERCEPTION';
    }

    if (title instanceof HTMLElement && title.dataset.perceptionTitle !== 'true') {
      title.dataset.perceptionTitle = 'true';
      title.innerHTML = '<span class="hero-line">知ったあと、</span><span class="hero-line">世界の<span class="difference-word" aria-label="差">差</span>が</span><span class="hero-line">少し見える。</span>';
    }

    if (lead instanceof HTMLElement) {
      lead.textContent = '言葉を得ると、それまで「なんとなく違う」だけだった感覚に輪郭が生まれる。名前から探すことも、偶然や問いから出会うこともできます。';

      if (!heroCopy.querySelector('.perception-spectrum')) {
        const spectrum = document.createElement('div');
        spectrum.className = 'perception-spectrum';
        spectrum.setAttribute('aria-hidden', 'true');
        spectrum.innerHTML = '<span class="perception-spectrum-label">なんとなく違う</span><span class="perception-spectrum-rule"></span><span class="perception-terms"><span class="perception-term">余白</span><span class="perception-term">密度</span><span class="perception-term">韻律</span><span class="perception-term">温度</span><span class="perception-term">階層</span></span>';
        lead.insertAdjacentElement('afterend', spectrum);
      }
    }

    document.querySelector('.search-surface')?.setAttribute('data-motion-meaning', 'focus');
    document.querySelector('.random-study')?.setAttribute('data-motion-meaning', 'discover');
    document.querySelector('.thought-portal')?.setAttribute('data-motion-meaning', 'connect');
    document.querySelector('.filter-zone')?.setAttribute('data-motion-meaning', 'split');
    document.querySelector('.library-zone')?.setAttribute('data-motion-meaning', 'focus');
    document.querySelector('#readerPanel')?.setAttribute('data-motion-meaning', 'focus');
    document.querySelector('#focusMap')?.setAttribute('data-motion-meaning', 'connect');

    const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('perception-ready')));
    if (perceptionStyles?.sheet) reveal();
    else perceptionStyles?.addEventListener('load', reveal, { once: true });
    window.setTimeout(reveal, 500);
  }

  armPerceptionIdentity();

  function watchTextUpdate(element) {
    if (!(element instanceof HTMLElement)) return;
    const observer = new MutationObserver(() => {
      replayClass(element, 'motion-update-pulse');
      removeAfter(element, 'motion-update-pulse');
    });
    observer.observe(element, { childList: true, characterData: true, subtree: true });
  }

  watchTextUpdate(document.querySelector('#resultCount'));
  watchTextUpdate(document.querySelector('#focusCount'));

  const searchInput = document.querySelector('#searchInput');
  const searchSurface = document.querySelector('.search-surface');
  if (searchInput instanceof HTMLInputElement && searchSurface instanceof HTMLElement) {
    const syncSearchFocus = () => {
      searchSurface.classList.toggle('is-focusing', document.activeElement === searchInput || searchInput.value.trim().length > 0);
    };
    searchInput.addEventListener('focus', syncSearchFocus);
    searchInput.addEventListener('input', syncSearchFocus);
    searchInput.addEventListener('blur', syncSearchFocus);
    syncSearchFocus();
  }

  const randomPanel = document.querySelector('#randomStudyCard');
  if (randomPanel instanceof HTMLElement) {
    window.addEventListener('random-study-changed', (event) => {
      const direction = event.detail?.direction || 'new';
      randomPanel.dataset.motionDirection = direction;
    });

    const randomObserver = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.type === 'childList')) return;
      replayClass(randomPanel, 'motion-random-arrive');
      replayClass(randomPanel, 'semantic-discover-arrive');
      removeAfter(randomPanel, 'motion-random-arrive');
      removeAfter(randomPanel, 'semantic-discover-arrive', 300);
    });
    randomObserver.observe(randomPanel, { childList: true, subtree: false });
  }

  const thoughtGrid = document.querySelector('#thoughtQuestions');
  const shuffleQuestions = document.querySelector('#shuffleQuestions');
  if (thoughtGrid instanceof HTMLElement) {
    const thoughtObserver = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.type === 'childList')) return;
      thoughtGrid.classList.remove('motion-replace-out');
      replayClass(thoughtGrid, 'motion-thought-arrive');
      replayClass(thoughtGrid, 'semantic-connect-arrive');
      removeAfter(thoughtGrid, 'motion-thought-arrive');
      removeAfter(thoughtGrid, 'semantic-connect-arrive', 220);
    });
    thoughtObserver.observe(thoughtGrid, { childList: true, subtree: false });

    shuffleQuestions?.addEventListener('pointerdown', () => {
      if (reducedMotion.matches) return;
      thoughtGrid.classList.add('motion-replace-out');
      window.setTimeout(() => thoughtGrid.classList.remove('motion-replace-out'), 180);
    });
  }

  const filterZone = document.querySelector('.filter-zone');
  if (filterZone instanceof HTMLElement) {
    filterZone.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest('.field-button, .chip, .feeling-disclosure > summary, #clearFilters')
        : null;
      if (!trigger) return;
      replayClass(filterZone, 'semantic-split');
      removeAfter(filterZone, 'semantic-split', 260);
    });
  }

  const readerPanel = document.querySelector('#readerPanel');
  if (readerPanel instanceof HTMLElement) {
    window.addEventListener('vocabulary-reader-changed', () => {
      if (!document.body.classList.contains('reader-open')) return;
      replayClass(readerPanel, 'semantic-focus-arrive');
      removeAfter(readerPanel, 'semantic-focus-arrive', 560);
    });
  }

  function watchMapUpdate(selector) {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) return;
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.type === 'childList')) return;
      replayClass(element, 'motion-map-arrive');
      replayClass(element, 'semantic-connect-arrive');
      removeAfter(element, 'motion-map-arrive', 260);
      removeAfter(element, 'semantic-connect-arrive', 240);
    });
    observer.observe(element, { childList: true, subtree: true });
  }

  watchMapUpdate('#focusMap');
  watchMapUpdate('#routeList');
})();