const state = {
  items: [],
  query: "",
  feeling: null,
  field: null,
};

const searchInput = document.querySelector("#searchInput");
const feelingChips = document.querySelector("#feelingChips");
const fieldFilters = document.querySelector("#fieldFilters");
const vocabularyGrid = document.querySelector("#vocabularyGrid");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const clearFilters = document.querySelector("#clearFilters");
const randomButton = document.querySelector("#randomButton");

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("ja");

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function buildSearchText(item) {
  return normalize([
    item.term,
    item.ja,
    item.one_liner,
    item.description,
    item.why_selected,
    ...(item.fields ?? []),
    ...(item.feelings ?? []),
  ].join(" "));
}

function filteredItems() {
  const query = normalize(state.query);

  return state.items.filter((item) => {
    const matchesQuery = !query || buildSearchText(item).includes(query);
    const matchesFeeling = !state.feeling || (item.feelings ?? []).includes(state.feeling);
    const matchesField = !state.field || (item.fields ?? []).includes(state.field);
    return matchesQuery && matchesFeeling && matchesField;
  });
}

function renderFeelingChips() {
  const feelings = uniqueSorted(state.items.flatMap((item) => item.feelings ?? []));

  feelingChips.innerHTML = feelings
    .map((feeling) => {
      const active = state.feeling === feeling;
      return `<button class="chip${active ? " is-active" : "}" type="button" data-feeling="${escapeHtml(feeling)}" aria-pressed="${active}">${escapeHtml(feeling)}</button>`;
    })
    .join("");
}

function renderFieldFilters() {
  const fields = uniqueSorted(state.items.flatMap((item) => item.fields ?? []));

  fieldFilters.innerHTML = fields
    .map((field) => {
      const active = state.field === field;
      return `<button class="field-button${active ? " is-active" : "}" type="button" data-field="${escapeHtml(field)}" aria-pressed="${active}">${escapeHtml(field)}</button>`;
    })
    .join("");
}

function renderResults() {
  const items = filteredItems();
  resultCount.textContent = `${items.length}語`;
  emptyState.hidden = items.length !== 0;

  vocabularyGrid.innerHTML = items.map(renderCard).join("");
}

function renderCard(item) {
  const fields = (item.fields ?? [])
    .map((field) => `<span class="mini-tag">${escapeHtml(field)}</span>`)
    .join("");

  const feelings = (item.feelings ?? [])
    .slice(0, 4)
    .map((feeling) => `<span class="mini-tag">${escapeHtml(feeling)}</span>`)
    .join("");

  const sources = (item.sources ?? [])
    .map((source, index) => `<li><a href="${escapeAttribute(source)}" target="_blank" rel="noopener noreferrer">Source ${index + 1}</a></li>`)
    .join("");

  const selectionContext = item.why_selected
    ? `
      <section class="selection-context" aria-label="この言葉を選んだ背景">
        <p class="detail-kicker">Why this word</p>
        <h4>この言葉を選んだ背景</h4>
        <p>${escapeHtml(item.why_selected)}</p>
      </section>
    `
    : "";

  return `
    <article class="vocab-card" id="${escapeAttribute(item.id)}">
      <details>
        <summary>
          <div class="card-topline">
            <div>
              <h3 class="card-term">${escapeHtml(item.term)}</h3>
              <p class="card-ja">${escapeHtml(item.ja)}</p>
            </div>
            <span class="expand-mark" aria-hidden="true">＋</span>
          </div>
          <p class="one-liner">${escapeHtml(item.one_liner)}</p>
          <div class="mini-tags">${fields}${feelings}</div>
        </summary>
        <div class="card-detail">
          <p class="description">${escapeHtml(item.description)}</p>
          ${selectionContext}
          <div class="example-box">
            <span class="example-label">Before</span>
            <p>${escapeHtml(item.before)}</p>
            <div class="after">
              <span class="example-label">After</span>
              <p>${escapeHtml(item.after)}</p>
            </div>
          </div>
          ${sources ? `<ul class="source-list">${sources}</ul>` : ""}
        </div>
      </details>
    </article>
  `;
}

function render() {
  renderFeelingChips();
  renderFieldFilters();
  renderResults();
}

function resetFilters() {
  state.query = "";
  state.feeling = null;
  state.field = null;
  searchInput.value = "";
  render();
}

function openRandomItem() {
  const items = filteredItems().length ? filteredItems() : state.items;
  if (!items.length) return;

  const item = items[Math.floor(Math.random() * items.length)];
  const card = document.getElementById(item.id);

  if (!card) {
    resetFilters();
    requestAnimationFrame(openRandomItem);
    return;
  }

  const details = card.querySelector("details");
  details.open = true;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderResults();
});

feelingChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-feeling]");
  if (!button) return;
  const feeling = button.dataset.feeling;
  state.feeling = state.feeling === feeling ? null : feeling;
  render();
});

fieldFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-field]");
  if (!button) return;
  const field = button.dataset.field;
  state.field = state.field === field ? null : field;
  render();
});

clearFilters.addEventListener("click", resetFilters);
randomButton.addEventListener("click", openRandomItem);

async function init() {
  try {
    const response = await fetch("./data/vocabularies.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.items = await response.json();
    render();
  } catch (error) {
    console.error(error);
    resultCount.textContent = "読み込みエラー";
    vocabularyGrid.innerHTML = `<div class="empty-state"><p>語彙データを読み込めませんでした。</p></div>`;
  }
}

init();
