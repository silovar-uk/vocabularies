(() => {
  Object.assign(FIELD_LABELS, {
    Semiotics: "記号論",
    Philosophy: "哲学",
    "Software Engineering": "ソフトウェア工学",
  });

  const researchSources = [
    "./data/research-20260810-semiotics-complexity.json?v=" + Date.now(),
    "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/data/research-20260810-semiotics-complexity.json",
  ];

  async function fetchResearchData() {
    let lastError;
    for (const url of researchSources) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Research vocabulary data is not an array");
        return data;
      } catch (error) {
        lastError = error;
        console.warn("Research vocabulary load failed:", url, error);
      }
    }
    throw lastError ?? new Error("Research vocabulary data could not be loaded");
  }

  function baseDataReady() {
    return state.items.some((item) => item.id === "composition");
  }

  async function waitForBaseData(maxWaitMs = 10000) {
    const started = Date.now();
    while (!baseDataReady() && Date.now() - started < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  async function initResearchVocabulary() {
    try {
      const researchItems = await fetchResearchData();
      await waitForBaseData();
      state.items = mergeItems(state.items, researchItems);
      render();
    } catch (error) {
      console.error("Research vocabulary could not be loaded:", error);
    }
  }

  initResearchVocabulary();
})();