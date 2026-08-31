# Concept Cluster Grammar

Vocabulariesでは、Clusterを**分野・カテゴリ・タグではなく、一つの問いを考えるために一緒に読む概念群**として扱う。

```text
WORD
  ↓
RELATION
  ↓
VERB FAMILY
  ↓
CLUSTER
```

## Source of truth

Cluster定義の正本は `data/clusters.json`。

各語彙データへ `clusters: [...]` を重複保存しない。1つのConceptが複数Clusterへ属することは許可する。

## Fieldとの違い

Fieldは「どの領域の語か」を示す。

Clusterは「この語群を一緒に読むと、どんな問いを考えられるか」を示す。

例：

- Field: `Software Engineering`
- Cluster: `安全にソフトウェアを変更する`

分野名だけで説明できるまとまりはClusterとして追加しない。

## Current schema

Clusterは現在、必要最小限の次のfieldを持つ。

- `id` — 安定した識別子
- `label` — 読む理由が伝わる短い名前
- `question` — このまとまりで考える中心的な問い
- `description` — なぜ一緒に読むのか
- `members` — 主要Concept。現在は3〜8語
- `entry` — 入り口に向くConcept
- `anchor` — Clusterの理解を支える中心Concept
- `boundaries` — 隣の問いへつながりやすいConcept

`summary` / `display_summary` のような用途重複fieldは増やさない。

## Discovery is not truth

`scripts/audit-clusters.mjs` はtyped relationsとpublished essay relationsを一つの無向Graphとして監査し、密度・degree・近傍を候補発見に使う。

Graph上で密な集合を、そのままConcept Clusterとはみなさない。

最終採用には少なくとも次を確認する。

1. 一つの問いとして説明できる
2. 既存Fieldとの差がある
3. 一緒に読む実用的な理由がある
4. Entryがある
5. 内部Conceptに役割差がある
6. 隣のClusterへつながるBoundaryがある

## Current clusters

| Cluster | Question |
| --- | --- |
| 安全にソフトウェアを変更する | 既存の振る舞いを壊さず、変更コストを下げながら変え続けるには？ |
| 次の操作を予測できるUIをつくる | 人は何を手掛かりに、何ができ、その結果をどう予測するのか？ |
| 記号が意味を持つ仕組みを考える | 言葉や記号は差異と関係の中でどう意味を持つのか？ |
| 頭の外へ思考を逃がす | 情報や操作を外部へ置くと、なぜ考えやすくなるのか？ |
| 複雑さをどこへ置くか | 消せない複雑さをどこへ移すと理解と操作の負担が減るか？ |
| 情報を増やさず、見え方を設計する | 何を残し、引き、目立たせると視線と意味の順序が生まれるか？ |

## Validation

`scripts/audit-clusters.mjs` が次を検査する。

- Cluster ID / label / questionの重複
- 未知Concept ID
- member数が3〜8の範囲
- `entry` / `anchor` / `boundaries` がmembers内に存在
- Cluster内の孤立member
- 内部relation density
- Cluster coverageと重複所属

低密度は即errorにせずwarning候補として扱う。意味のある越境Clusterは、分野をまたぐため密度だけでは評価できない。

## Concept Map

Concept MapではCluster専用画面を作らない。

Focusしている語がClusterに属する場合だけ、中心語の近くへ小さく `CONTEXT · <cluster label>` を表示する。

Clusterに属さない語のUIは変えない。

目的は新しいナビゲーションを増やすことではなく、「この語を何の問いの中で読めるか」という文脈を足すこと。

## Adding a cluster

1. Graph auditから候補を見る
2. Field名ではなくQuestion / Thinking Jobで命名する
3. 3〜8語へ絞る
4. `entry` / `anchor` / `boundaries` を決める
5. `data/clusters.json` に1回だけ定義する
6. `node scripts/audit-clusters.mjs`
7. Concept Mapで代表Conceptと重複所属Conceptを確認する

Concept側へCluster IDを追記しない。

## Not yet: Learning Path

Clusterは学習順序ではない。

現在は `entry` / `anchor` / `boundaries` だけを持つ。今後、複数Clusterに共通して `MECHANISM` / `CONTRAST` / `ACTION` などの役割が本当に観察できる場合にのみRole Grammarを検討する。

Role Grammarが成立する前に、固定のLearning Pathを大量に作らない。
