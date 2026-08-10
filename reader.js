(() => {
  state.activeItemId = state.activeItemId ?? null;

  const readerPanel = document.querySelector("#readerPanel");
  const readerContent = document.querySelector("#readerContent");
  const readerClose = document.querySelector("#readerClose");
  const readerBackdrop = document.querySelector("#readerBackdrop");

  if (!readerPanel || !readerContent || !readerClose || !readerBackdrop) return;

  let lastReaderTrigger = null;

  function itemById(id) {
    return state.items.find((item) => item.id === id) ?? null;
  }

  function relatedPreview(item) {
    return (item.related ?? [])
      .map(itemById)
      .filter(Boolean)
      .slice(0, 3)
      .map((relatedItem) => displayNames(relatedItem).primary);
  }

  renderCard = function readerCard(item) {
    const names = displayNames(item);
    const primaryClass = names.primaryLanguage === "en" ? " card-term-en" : "";
    const fields = (item.fields ?? [])
      .slice(0, 4)
      .map((field) => '<span class="mini-tag">' + escapeHtml(fieldLabel(field)) + '</span>')
      .join("");
    const related = relatedPreview(item);
    const relatedLine = related.length
      ? '<p class="card-related"><span>周辺</span>' + escapeHtml(related.join(" ・ ")) + '</p>'
      : "";
    const activeClass = state.activeItemId === item.id ? " is-reader-active" : "";
    const secondaryName = names.secondary
      ? '<p class="card-en">' + escapeHtml(names.secondary) + '</p>'
      : "";

    return '<article class="vocab-card' + activeClass + '" id="' + escapeAttribute(item.id) +
      '" role="button" tabindex="0" data-open-term="' + escapeAttribute(item.id) +
      '" aria-label="' + escapeAttribute(names.primary) + 'を読む">' +
        '<div class="card-topline">' +
          '<div>' +
            '<h3 class="card-term' + primaryClass + '">' + escapeHtml(names.primary) + '</h3>' +
            secondaryName +
          '</div>' +
          '<span class="read-mark" aria-hidden="true">↗</span>' +
        '</div>' +
        '<p class="one-liner">' + escapeHtml(item.one_liner) + '</p>' +
        '<div class="mini-tags">' + fields + '</div>' +
        relatedLine +
      '</article>';
  };

  function renderRelatedItems(item) {
    const relatedItems = (item.related ?? []).map(itemById).filter(Boolean);
    if (!relatedItems.length) return "";

    return '<section class="reader-section reader-relations">' +
      '<p class="reader-kicker">この言葉のまわり</p>' +
      '<div class="relation-list">' +
        relatedItems.map((relatedItem) => {
          const names = displayNames(relatedItem);
          return '<button class="relation-link" type="button" data-reader-term="' +
            escapeAttribute(relatedItem.id) + '">' +
            '<span class="relation-name">' + escapeHtml(names.primary) + '</span>' +
          '</button>';
        }).join("") +
      '</div>' +
    '</section>';
  }

  function renderReader() {
    const item = itemById(state.activeItemId);
    if (!item) {
      readerContent.innerHTML = "";
      readerPanel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("reader-open");
      return;
    }

    const names = displayNames(item);
    const fields = (item.fields ?? [])
      .map((field) => '<span class="reader-field">' + escapeHtml(fieldLabel(field)) + '</span>')
      .join("");
    const feelings = (item.feelings ?? [])
      .map((feeling) => '<span class="reader-feeling">' + escapeHtml(feeling) + '</span>')
      .join("");
    const sources = (item.sources ?? [])
      .map((source, index) => '<li><a href="' + escapeAttribute(source) +
        '" target="_blank" rel="noopener noreferrer">出典 ' + (index + 1) + '</a></li>')
      .join("");

    readerContent.innerHTML =
      '<header class="reader-head">' +
        '<div class="reader-fields">' + fields + '</div>' +
        '<h2 class="reader-title">' + escapeHtml(names.primary) + '</h2>' +
        (names.secondary ? '<p class="reader-subtitle">' + escapeHtml(names.secondary) + '</p>' : '') +
        '<p class="reader-lead">' + escapeHtml(item.one_liner) + '</p>' +
      '</header>' +
      '<section class="reader-section reader-definition"><p>' + escapeHtml(item.description) + '</p></section>' +
      (item.why_selected ?
        '<section class="reader-section reader-selection">' +
          '<p class="reader-kicker">なぜ、この言葉か</p>' +
          '<p>' + escapeHtml(item.why_selected) + '</p>' +
        '</section>' : '') +
      '<section class="reader-section reader-example">' +
        '<div class="reader-example-row">' +
          '<span class="reader-kicker">もとの言い方</span>' +
          '<p>' + escapeHtml(item.before) + '</p>' +
        '</div>' +
        '<div class="reader-example-row is-after">' +
          '<span class="reader-kicker">言い換えると</span>' +
          '<p>' + escapeHtml(item.after) + '</p>' +
        '</div>' +
      '</section>' +
      renderRelatedItems(item) +
      (feelings ? '<section class="reader-section reader-feelings"><p class="reader-kicker">感覚の手掛かり</p><div class="reader-feeling-list">' + feelings + '</div></section>' : '') +
      (sources ? '<section class="reader-section reader-sources"><p class="reader-kicker">出典</p><ul>' + sources + '</ul></section>' : '');

    readerPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("reader-open");
  }

  const originalRender = render;
  render = function readerAwareRender() {
    originalRender();
    renderReader();
    syncReaderFromLocation();
  };

  function hashFor(id) {
    return id ? "#term=" + encodeURIComponent(id) : "";
  }

  function setHash(id, mode = "push") {
    const url = new URL(window.location.href);
    url.hash = hashFor(id);
    history[mode === "replace" ? "replaceState" : "pushState"](null, "", url);
  }

  function openReader(id, options = {}) {
    if (!itemById(id)) return;
    state.activeItemId = id;
    if (options.trigger) lastReaderTrigger = options.trigger;
    renderResults();
    renderReader();
    readerPanel.scrollTop = 0;
    if (options.updateHistory !== false) setHash(id, options.historyMode ?? "push");
    requestAnimationFrame(() => readerClose.focus({ preventScroll: true }));
  }

  function closeReader(options = {}) {
    if (!state.activeItemId) return;
    state.activeItemId = null;
    renderResults();
    renderReader();
    if (options.updateHistory !== false) setHash(null, options.historyMode ?? "push");
    if (options.restoreFocus !== false && lastReaderTrigger?.isConnected) {
      lastReaderTrigger.focus({ preventScroll: true });
    }
  }

  function requestedTerm() {
    const match = window.location.hash.match(/^#term=(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function syncReaderFromLocation() {
    const id = requestedTerm();
    if (!id) {
      if (state.activeItemId) closeReader({ updateHistory: false, restoreFocus: false });
      return;
    }
    if (!itemById(id) || state.activeItemId === id) return;
    state.activeItemId = id;
    renderResults();
    renderReader();
  }

  vocabularyGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-open-term]");
    if (!card) return;
    openReader(card.dataset.openTerm, { trigger: card });
  });

  vocabularyGrid.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-open-term]");
    if (!card || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openReader(card.dataset.openTerm, { trigger: card });
  });

  readerContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reader-term]");
    if (!button) return;
    openReader(button.dataset.readerTerm, { trigger: button });
  });

  readerClose.addEventListener("click", () => closeReader());
  readerBackdrop.addEventListener("click", () => closeReader());

  randomButton.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    const current = filteredItems();
    const items = current.length ? current : state.items;
    if (!items.length) return;
    const item = items[Math.floor(Math.random() * items.length)];
    openReader(item.id, { trigger: randomButton });
  }, true);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeItemId) closeReader();
  });

  window.addEventListener("popstate", syncReaderFromLocation);

  renderResults();
  syncReaderFromLocation();
})();
