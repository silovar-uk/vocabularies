const DEFAULT_DATASETS = [
  "data/vocabularies.json",
  "data/research-20260810-semiotics-complexity.json",
  "data/meta-vocabularies.json",
  "data/research-20260810-editorial.json",
];

const DEFAULT_RELATION_DATASETS = [
  "data/relations.json",
  "data/relations-20260810-editorial.json",
];

const state = {
  items: [],
  query: "",
  feeling: null,
  field: null,
  activeItemId: null,
  catalog: {
    schema_version: 1,
    datasets: DEFAULT_DATASETS,
    relation_datasets: DEFAULT_RELATION_DATASETS,
    defaults: { primary_language: "ja", formal_status: "established_term", aliases: [] },
    formal_status_labels: {},
    field_labels: {},
    taxonomy: [],
    terms: {},
    search_contrasts: [],
  },
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

function fieldLabel(field) {
  return state.catalog.field_labels?.[field] ?? field;
}

function fieldGroup(field) {
  return (state.catalog.taxonomy ?? []).find((group) => (group.fields ?? []).includes(field)) ?? null;
}

function formalStatusLabel(item) {
  return state.catalog.formal_status_labels?.[item.formal_status] ?? item.formal_status ?? "";
}

function displayNames(item) {
  const hasJapanese = Boolean(String(item.ja ?? "").trim());
  const hasEnglish = Boolean(String(item.term ?? "").trim());
  const englishFirst = item.primary_language === "en" || !hasJapanese;

  if (englishFirst) {
    return {
      primary: item.term,
      secondary: hasJapanese ? item.ja : "",
      primaryLanguage: "en",
    };
  }

  return {
    primary: item.ja,
    secondary: hasEnglish ? item.term : "",
    primaryLanguage: "ja",
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    return fieldLabel(a).localeCompare(fieldLabel(b), "ja");
  });
}

function mergeItems(...collections) {
  const map = new Map();
  collections.flat().forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

function applyCatalogMetadata(item) {
  const defaults = state.catalog.defaults ?? {};
  const metadata = state.catalog.terms?.[item.id] ?? {};
  const aliases = [...new Set([
    ...(defaults.aliases ?? []),
    ...(item.aliases ?? []),
    ...(metadata.aliases ?? []),
  ].filter(Boolean))];

  return {
    ...defaults,
    ...item,
    ...metadata,
    aliases,
  };
}

function buildSearchText(item) {
  const groups = (item.fields ?? []).map(fieldGroup).filter(Boolean).map((group) => group.label);
  return normalize([
    item.ja,
    item.term,
    ...(item.aliases ?? []),
    item.one_liner,
    item.description,
    item.why_selected,
    formalStatusLabel(item),
    ...(item.fields ?? []),
    ...(item.fields ?? []).map(fieldLabel),
    ...groups,
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
  const feelings = [...new Set(state.items.flatMap((item) => item.feelings ?? []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));

  feelingChips.innerHTML = feelings
    .map((feeling) => {
      const activeClass = state.feeling === feeling ? " is-active" : "";
      const pressed = state.feeling === feeling ? "true" : "false";
      return '<button class="chip' + activeClass + '" type="button" data-feeling="' +
        escapeAttribute(feeling) + '" aria-pressed="' + pressed + '">' +
        escapeHtml(feeling) + '</button>';
    })
    .join("");
}

function fieldButton(field) {
  const activeClass = state.field === field ? " is-active" : "";
  const pressed = state.field === field ? "true" : "false";
  return '<button class="field-button' + activeClass + '" type="button" data-field="' +
    escapeAttribute(field) + '" aria-pressed="' + pressed + '">' +
    escapeHtml(fieldLabel(field)) + '</button>';
}

function renderFieldFilters() {
  const availableFields = uniqueSorted(state.items.flatMap((item) => item.fields ?? []));
  const availableSet = new Set(availableFields);
  const used = new Set();
  const groups = [];

  for (const group of state.catalog.taxonomy ?? []) {
    const fields = (group.fields ?? []).filter((field) => availableSet.has(field));
    if (!fields.length) continue;
    fields.forEach((field) => used.add(field));
    groups.push({ label: group.label, fields });
  }

  const remaining = availableFields.filter((field) => !used.has(field));
  if (remaining.length) groups.push({ label: "その他", fields: remaining });

  if (!groups.length) {
    fieldFilters.innerHTML = availableFields.map(fieldButton).join("");
    return;
  }

  fieldFilters.innerHTML = groups.map((group) =>
    '<div class="field-group">' +
      '<p class="field-group-label">' + escapeHtml(group.label) + '</p>' +
      '<div class="field-group-buttons">' + group.fields.map(fieldButton).join("") + '</div>' +
    '</div>'
  ).join("");
}

function itemNameById(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  return item ? displayNames(item).primary : id;
}

function renderCard(item) {
  const names = displayNames(item);
  const primaryClass = names.primaryLanguage === "en" ? " card-term-en" : "";
  const fields = (item.fields ?? [])
    .slice(0, 4)
    .map((field) => '<span class="mini-tag">' + escapeHtml(fieldLabel(field)) + '</span>')
    .join("");
  const related = (item.related ?? []).slice(0, 3).map(itemNameById);
  const relatedLine = related.length
    ? '<p class="card-related"><span>周辺</span>' + escapeHtml(related.join(" ・ ")) + '</p>'
    : "";
  const secondaryName = names.secondary
    ? '<p class="card-en">' + escapeHtml(names.secondary) + '</p>'
    : "";

  return '<article class="vocab-card" id="' + escapeAttribute(item.id) +
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
}

function renderResults() {
  const items = filteredItems();
  resultCount.textContent = items.length + "語";
  emptyState.hidden = items.length !== 0;
  vocabularyGrid.innerHTML = items.map(renderCard).join("");
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
  const current = filteredItems();
  const items = current.length ? current : state.items;
  if (!items.length) return;

  const item = items[Math.floor(Math.random() * items.length)];
  const card = document.getElementById(item.id);
  if (!card) {
    resetFilters();
    requestAnimationFrame(openRandomItem);
    return;
  }

  card.click();
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

async function loadJson(path) {
  const cleanPath = String(path).replace(/^\.\//, "");
  const urls = [
    "./" + cleanPath + "?v=" + Date.now(),
    "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/" + cleanPath,
  ];

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn("Data load failed:", url, error);
    }
  }

  throw lastError ?? new Error("Data could not be loaded: " + cleanPath);
}

async function loadCatalog() {
  const catalog = await loadJson("data/catalog.json");
  if (!catalog || Array.isArray(catalog) || typeof catalog !== "object") {
    throw new Error("Catalog data is not an object");
  }
  return catalog;
}

async function loadVocabularyData() {
  const datasets = state.catalog.datasets?.length ? state.catalog.datasets : DEFAULT_DATASETS;
  const collections = await Promise.all(datasets.map(async (path) => {
    const data = await loadJson(path);
    if (!Array.isArray(data)) throw new Error(path + " is not an array");
    return data;
  }));
  return mergeItems(...collections).map(applyCatalogMetadata);
}

async function init() {
  render();

  try {
    state.catalog = {
      ...state.catalog,
      ...(await loadCatalog()),
    };
  } catch (error) {
    console.error("Catalog load failed:", error);
  }

  try {
    state.items = await loadVocabularyData();
    render();
  } catch (error) {
    console.error(error);
    resultCount.textContent = state.items.length + "語（データ取得失敗）";
    vocabularyGrid.insertAdjacentHTML(
      "beforeend",
      '<div class="load-warning"><strong>語彙データの取得に失敗しました。</strong><br>この画面を再読み込みしてください。</div>'
    );
  }
}

init();
