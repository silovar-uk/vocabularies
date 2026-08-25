(() => {
  const previousFetch = window.fetch.bind(window);
  const extraDatasets = [
    "data/research-20260825-bbc-ai-vocabulary.json",
    "data/research-20260825-evening-vocabulary.json",
  ];

  window.fetch = async (...args) => {
    const response = await previousFetch(...args);
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
      console.warn("August 25 vocabulary extension failed:", error);
      return response;
    }
  };
})();
