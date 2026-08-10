(() => {
  const readerContent = document.querySelector("#readerContent");
  if (!readerContent || typeof loadJson !== "function") return;

  let essayIndex = { essays: {} };
  let ready = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function essayEntry(id) {
    const entry = essayIndex.essays?.[id];
    return entry?.status === "published" ? entry : null;
  }

  function syncEssayLink() {
    if (!ready) return;
    const existing = readerContent.querySelector("[data-concept-essay-link]");
    if (existing) existing.remove();

    const id = state?.activeItemId;
    if (!id || !essayEntry(id) || !readerContent.children.length) return;

    const item = state.items?.find((candidate) => candidate.id === id);
    const name = item ? displayNames(item).primary : id;
    const section = document.createElement("section");
    section.className = "reader-section reader-concept-essay";
    section.setAttribute("data-concept-essay-link", "");
    section.innerHTML =
      '<p class="reader-kicker">この言葉で考える</p>' +
      '<a class="concept-essay-link" href="./term.html?id=' + encodeURIComponent(id) + '">' +
        '<span class="concept-essay-copy">' +
          '<strong>' + escapeHtml(name) + 'から、議論を広げる</strong>' +
          '<span>定義の先へ。この言葉を使って、仕事・生活・設計を考える。</span>' +
        '</span>' +
        '<span class="concept-essay-arrow" aria-hidden="true">→</span>' +
      '</a>';

    const relationSection = readerContent.querySelector(".reader-relations");
    if (relationSection) readerContent.insertBefore(section, relationSection);
    else readerContent.appendChild(section);
  }

  const observer = new MutationObserver(() => {
    queueMicrotask(syncEssayLink);
  });
  observer.observe(readerContent, { childList: true, subtree: false });

  loadJson("data/essay-index.json")
    .then((data) => {
      if (data && !Array.isArray(data) && typeof data === "object") essayIndex = data;
    })
    .catch((error) => console.error("Essay index could not be loaded:", error))
    .finally(() => {
      ready = true;
      syncEssayLink();
    });
})();
