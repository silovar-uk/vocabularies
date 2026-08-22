(() => {
  const previousFetch = window.fetch.bind(window);
  const extraDataset = "data/research-20260822-evening.json";

  window.fetch = async (...args) => {
    const response = await previousFetch(...args);
    const target = String(args[0] ?? "");
    if (!target.includes("data/catalog.json")) return response;

    try {
      const catalog = await response.clone().json();
      if (!Array.isArray(catalog.datasets)) catalog.datasets = [];
      if (!catalog.datasets.includes(extraDataset)) catalog.datasets.push(extraDataset);
      return new Response(JSON.stringify(catalog), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.warn("August 22 evening vocabulary extension failed:", error);
      return response;
    }
  };
})();
