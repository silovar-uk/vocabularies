(() => {
  const searchInput = document.querySelector('#searchInput');
  const fieldFilters = document.querySelector('#fieldFilters');
  const feelingChips = document.querySelector('#feelingChips');
  const summary = document.querySelector('#activeFilterSummary');

  function text(value) {
    return String(value ?? '').trim();
  }

  function renderSummary() {
    if (!(summary instanceof HTMLElement)) return;

    const items = [];
    const query = text(searchInput?.value);
    const activeField = fieldFilters?.querySelector('.field-button.is-active');
    const activeFeeling = feelingChips?.querySelector('.chip.is-active');

    if (query) items.push(`検索「${query}」`);
    if (activeField) items.push(`分野：${text(activeField.textContent)}`);
    if (activeFeeling) items.push(`感覚：${text(activeFeeling.textContent)}`);

    if (!items.length) {
      summary.innerHTML = '<span class="filter-summary-empty">すべての語彙を表示中</span>';
      return;
    }

    summary.innerHTML = items
      .map((item) => `<span class="filter-summary-pill">${escapeHtml(item)}</span>`)
      .join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setupFeelingPreview() {
    if (!(feelingChips instanceof HTMLElement)) return;
    if (feelingChips.dataset.uiPreviewReady === 'true') return;

    const buttons = [...feelingChips.querySelectorAll('.chip')];
    if (buttons.length <= 10) return;

    feelingChips.dataset.uiPreviewReady = 'true';
    let expanded = false;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'filter-expand-button';
    toggle.setAttribute('aria-controls', 'feelingChips');

    const apply = () => {
      buttons.forEach((button, index) => {
        const shouldHide = !expanded && index >= 10 && button.getAttribute('aria-pressed') !== 'true';
        button.dataset.uiSecondary = index >= 10 ? 'true' : 'false';
        button.hidden = shouldHide;
      });

      const hiddenCount = buttons.filter((button) => button.hidden).length;
      toggle.textContent = expanded ? '代表だけ表示' : `すべて見る（＋${hiddenCount}）`;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.hidden = !expanded && hiddenCount === 0;
    };

    toggle.addEventListener('click', () => {
      expanded = !expanded;
      apply();
    });

    feelingChips.insertAdjacentElement('afterend', toggle);
    apply();

    const stateObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'attributes' && mutation.attributeName === 'aria-pressed')) {
        apply();
        renderSummary();
      }
    });
    buttons.forEach((button) => stateObserver.observe(button, { attributes: true, attributeFilter: ['aria-pressed'] }));
  }

  function observeFilterContainer(container) {
    if (!(container instanceof HTMLElement)) return;
    const observer = new MutationObserver(() => {
      renderSummary();
      if (container === feelingChips) setupFeelingPreview();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
  }

  searchInput?.addEventListener('input', renderSummary);
  document.querySelector('#clearFilters')?.addEventListener('click', () => window.setTimeout(renderSummary, 0));

  observeFilterContainer(fieldFilters);
  observeFilterContainer(feelingChips);

  window.addEventListener('vocabulary-items-ready', () => {
    setupFeelingPreview();
    renderSummary();
  });

  setupFeelingPreview();
  renderSummary();
})();
