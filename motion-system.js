(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function replayClass(element, className) {
    if (!(element instanceof HTMLElement) || reducedMotion.matches) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function removeAfter(element, className, delay = 220) {
    window.setTimeout(() => element?.classList.remove(className), delay);
  }

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

  const randomPanel = document.querySelector('#randomStudyCard');
  if (randomPanel instanceof HTMLElement) {
    window.addEventListener('random-study-changed', (event) => {
      const direction = event.detail?.direction || 'new';
      randomPanel.dataset.motionDirection = direction;
    });

    const randomObserver = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.type === 'childList')) return;
      replayClass(randomPanel, 'motion-random-arrive');
      removeAfter(randomPanel, 'motion-random-arrive');
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
      removeAfter(thoughtGrid, 'motion-thought-arrive');
    });
    thoughtObserver.observe(thoughtGrid, { childList: true, subtree: false });

    shuffleQuestions?.addEventListener('pointerdown', () => {
      if (reducedMotion.matches) return;
      thoughtGrid.classList.add('motion-replace-out');
      window.setTimeout(() => thoughtGrid.classList.remove('motion-replace-out'), 180);
    });
  }

  function watchMapUpdate(selector) {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) return;
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.type === 'childList')) return;
      replayClass(element, 'motion-map-arrive');
      removeAfter(element, 'motion-map-arrive', 260);
    });
    observer.observe(element, { childList: true, subtree: true });
  }

  watchMapUpdate('#focusMap');
  watchMapUpdate('#routeList');
})();