(() => {
  const nativeFetch = window.fetch.bind(window);
  const extraDatasets = [
    "data/research-20260811-relational-judgment.json",
    "data/research-20260811-judgment-process.json",
    "data/research-20260812-learning-judgment.json",
    "data/research-20260812-perception-expression.json",
    "data/research-20260813-cognitive-environment.json",
  ];

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const target = String(args[0] ?? "");
    if (!target.includes("data/catalog.json")) return response;

    try {
      const catalog = await response.clone().json();
      if (!Array.isArray(catalog.datasets)) catalog.datasets = [];
      for (const extraDataset of extraDatasets) {
        if (!catalog.datasets.includes(extraDataset)) catalog.datasets.push(extraDataset);
      }
      return new Response(JSON.stringify(catalog), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.warn("Vocabulary dataset extension failed:", error);
      return response;
    }
  };
})();
