(() => {
  const previousFetch = window.fetch.bind(window);
  const extraDatasets = [
    "data/research-20260814-invariants-tradeoffs.json",
    "data/research-20260814-perspective-context-metrics.json",
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
      console.warn("August 14 vocabulary dataset extension failed:", error);
      return response;
    }
  };
})();
