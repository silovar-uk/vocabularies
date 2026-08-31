(() => {
  const nativeFetch = window.fetch.bind(window);
  const extraDatasets = [
    "data/research-20260811-relational-judgment.json",
    "data/research-20260811-judgment-process.json",
    "data/research-20260812-learning-judgment.json",
    "data/research-20260812-perception-expression.json",
    "data/research-20260813-cognitive-environment.json",
    "data/research-20260814-invariants-tradeoffs.json",
    "data/research-20260814-perspective-context-metrics.json",
    "data/research-20260815-expressive-aesthetics.json",
    "data/research-20260816-relational-composition.json",
    "data/research-20260816-context-embodiment.json",
    "data/research-20260817-friction-learning-aesthetics.json",
    "data/research-20260817-thinking-environment.json",
    "data/research-20260817-cognitive-dimensions-interface.json",
    "data/research-20260818-continuity.json",
    "data/research-20260818-distributed-cognition.json",
    "data/research-20260819-far-exploration.json",
    "data/research-20260819-practical-design-tech.json",
    "data/research-20260820-practical-terms.json",
    "data/research-20260820-practical-design-ops.json",
    "data/research-20260822-morning-vocabulary.json",
    "data/research-20260822-evening.json",
    "data/research-20260823-morning-vocabulary.json",
    "data/research-20260823-typography-cluster.json",
    "data/research-20260823-evening-vocabulary.json",
    "data/research-20260824-morning-vocabulary.json",
    "data/research-20260824-evening-vocabulary.json",
    "data/research-20260825-bbc-ai-vocabulary.json",
    "data/research-20260825-evening-vocabulary.json",
    "data/research-20260826-morning-vocabulary.json",
    "data/research-20260831-technical-debt.json",
  ];
  const extraRelationDatasets = [
    "data/relations-20260831-technical-debt.json",
  ];

  window.VocabularyDatasetManifest = Object.freeze([...extraDatasets]);

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const target = String(args[0] ?? "");
    if (!target.includes("data/catalog.json")) return response;

    try {
      const catalog = await response.clone().json();
      if (!Array.isArray(catalog.datasets)) catalog.datasets = [];
      for (const dataset of extraDatasets) {
        if (!catalog.datasets.includes(dataset)) catalog.datasets.push(dataset);
      }
      if (!Array.isArray(catalog.relation_datasets)) catalog.relation_datasets = [];
      for (const dataset of extraRelationDatasets) {
        if (!catalog.relation_datasets.includes(dataset)) catalog.relation_datasets.push(dataset);
      }
      return new Response(JSON.stringify(catalog), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.warn("Vocabulary dataset manifest could not extend catalog:", error);
      return response;
    }
  };
})();
