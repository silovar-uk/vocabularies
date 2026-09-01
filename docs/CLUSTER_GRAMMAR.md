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
  ↓
ROLE
  ↓
SOFT PATH (derived, pilot only)
```

RoleはLearning Pathそのものではない。Cluster内で各Conceptが理解にどんな仕事をするかを表す中間層であり、Soft Path PilotではRoleと既存Relationから「次に見ると理解が進みやすい候補」をその場で導出する。

## Source of truth

Cluster定義、Role Grammar、Soft Path Pilotの設定は `data/clusters.json` を正本とする。

各語彙データへ `clusters: [...]` や固定Roleを重複保存しない。1つのConceptが複数Clusterへ属することは許可し、Roleは **Concept × Cluster** の関係として扱う。

Soft Pathのedgeや順序は保存しない。Path候補は既存typed relationをその場で読む。

## Fieldとの違い

Fieldは「どの領域の語か」を示す。

Clusterは「この語群を一緒に読むと、どんな問いを考えられるか」を示す。

例：

- Field: `Software Engineering`
- Cluster: `安全にソフトウェアを変更する`

分野名だけで説明できるまとまりはClusterとして追加しない。

## Current cluster schema

Clusterは現在、必要最小限の次のfieldを持つ。

- `id` — 安定した識別子
- `label` — 読む理由が伝わる短い名前
- `question` — このまとまりで考える中心的な問い
- `description` — なぜ一緒に読むのか
- `members` — 主要Concept。現在は3〜8語
- `entry` — 入り口に向くConcept
- `anchor` — Clusterの理解を支える代表Concept
- `boundaries` — 隣の問いへつながりやすいConcept
- `roles` — このCluster内でConceptが担うPrimary Thinking Role。全memberへの付与は必須ではない

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

# Concept Role Grammar

## Why Role exists

Relationは「Concept AとBがどうつながるか」を示す。

Verb Familyは「その関係をどんな思考操作として読むか」を示す。

Clusterは「どんな問いを考えるために一緒に読むか」を示す。

Roleは「その問いを理解する中で、このConceptがどんな仕事をするか」を示す。

RoleはConcept自体の固定属性ではない。同じConceptでも、別Clusterでは異なるRoleになりうる。

## Role-free observation

Role名を先に決めず、6 Clusterのmemberが果たしている仕事を自然文で観察した。

繰り返し現れた仕事は大きく次の5つだった。

1. 曖昧な違和感や状態を、観察できる問題として見えるようにする
2. なぜそうなるか、どんな構造で成り立つかを説明する
3. 似て見える概念や原因を分ける
4. 状態へ実際に働きかける手段・安全網・設計レバーを与える
5. 状態や介入結果を何で判断すればよいかを与える

この5つを正式なPrimary Thinking Roleとして採用した。

## Current roles

| Role | User-facing label | Thinking Job |
| --- | --- | --- |
| `DIAGNOSE` | 問題を見つける | 曖昧な違和感や状態を観察可能な問題へする |
| `MODEL` | 仕組みを説明する | 原因・構造・成立の仕組みを理解するモデルを与える |
| `DISTINGUISH` | 混同を分ける | 似た概念や原因を切り分ける |
| `INTERVENE` | 変える手掛かりを与える | 実際に働きかける方法・安全網・設計レバーを与える |
| `EVALUATE` | 良し悪しを確かめる | 状態や介入結果を見る評価軸を与える |

## Rejected / merged role candidates

- `SIGNAL` — `DIAGNOSE`へ統合。兆候は「問題を見つける」仕事の一形態
- `SUPPORT` — `INTERVENE`へ統合。安全網や支援手段も状態へ働きかけるレバーとして扱える
- `CONTEXT` — `MODEL`へ統合。状況を説明するだけで独立Grammarにする再利用性が弱い
- `ENTRY` — Thinking Roleではなくnavigation metadataとして維持
- `ANCHOR` — 代表Conceptを示すnavigation/editorial metadataとして維持
- `BOUNDARY` — Cluster間接続を示すnavigation metadataとして維持

Role数を増やすこと自体を成果にしない。

## ENTRY / ANCHOR / BOUNDARY are not Thinking Roles

`entry` / `anchor` / `boundaries` はRole Grammarへ統合しない。

- `entry` — どこから入りやすいか
- `anchor` — どのConceptを代表として扱うか
- `boundaries` — どこから隣の問いへ出やすいか

これらは**読む経路のmetadata**。

`DIAGNOSE` / `MODEL` / `DISTINGUISH` / `INTERVENE` / `EVALUATE` は**理解の中でConceptが果たす仕事**。

両者を分離する。

## Role assignments

Roleは `data/clusters.json` の各Cluster内だけに保存する。

```json
{
  "roles": {
    "technical-debt": "DIAGNOSE",
    "refactoring": "INTERVENE",
    "maintainability": "EVALUATE"
  }
}
```

Concept本体へ `role` を追加しない。

Primary Roleを無理に全memberへ付けない。現在、意味が二方向へ割れやすい `linguistic-value` と `thinking-outside-head` 内の `composition` は未割当のまま残している。

## Validation

`scripts/audit-clusters.mjs` がClusterに加えてRole Grammarも検査する。

Cluster validation:

- Cluster ID / label / questionの重複
- 未知Concept ID
- member数が3〜8の範囲
- `entry` / `anchor` / `boundaries` がmembers内に存在
- Cluster内の孤立member
- 内部relation density
- Cluster coverageと重複所属

Role validation:

- Role数が4〜7の範囲
- Role definitionのlabel / description
- 未知Role
- Cluster外ConceptへのRole assignment
- 未使用Role
- 汎用Roleが3 Cluster以上で再現しているか
- Cluster-member slotに対するRole coverageが70%以上か

RoleなしConceptは許可する。coverage 100%を目的にしない。

# Path Readiness Experiment

Role Grammarの目的は分類表を増やすことではなく、「なぜ次にこのConceptを見るのか」を説明できるかを検証すること。

固定Learning Pathは保存しない。

## Pilot 1 — 安全にソフトウェアを変更する

固定一本道より、枝分かれ型が自然。

```text
Technical Debt        DIAGNOSE
  ├─ Code Smell       DIAGNOSE
  └─ Legacy Code      MODEL
       ↓
Characterization Test INTERVENE
       ↓
Refactoring           INTERVENE
       ↓
Maintainability       EVALUATE
```

Transitionの説明：

- Technical Debt → Code Smell: 抽象的な将来コストから、問題を疑う具体的な兆候へ移る
- Technical Debt → Legacy Code: 負債一般から、安全な変更が難しくなる具体的な文脈を見る
- Legacy Code → Characterization Test: 変更困難な状態を理解したあと、現在挙動を固定する安全網を置く
- Characterization Test → Refactoring: 振る舞いを守れる状態を作ってから内部構造へ介入する
- Refactoring → Maintainability: 介入後を変更・理解・テストのしやすさという品質軸から見る

Relation dataが各transitionを支えているため、Roleだけで順番を発明しているわけではない。

## Pilot 2 — 次の操作を予測できるUIをつくる

こちらも一本道より分岐が自然。

```text
Gulfs of Action       DIAGNOSE
  ├─ Conceptual Model MODEL
  ├─ Signifier        INTERVENE
  │    ↔ Affordance   DISTINGUISH
  │    └ Constraints  INTERVENE
  └─ Visibility of System Status
                       INTERVENE

Signifier / Constraints
        ↓
Discoverability       EVALUATE
```

Transitionの説明：

- Gulfs → Conceptual Model: 「どこで分からなくなるか」から、利用者が仕組みをどう理解しているかへ進む
- Gulfs → Signifier: 実行側の隔たりを、行為を発見させる手掛かりから縮める
- Signifier ↔ Affordance: 見える手掛かりと、実際に可能な行為を混同しない
- Signifier → Constraints: 何ができるかを示すだけでなく、不適切な行為を狭める
- Signifier / Constraints → Discoverability: 介入が「今できることを発見できる状態」へつながったか評価する
- Gulfs → Visibility of System Status: 評価側の隔たりには、結果や現在状態を見せる別の介入が必要

Role順を強制するのではなく、Cluster Questionと実Relationによってbranchを作る。

## Path Readiness decision

判定：

**ROLE GRAMMAR ACCEPTED / PATH READY FOR A SMALL PILOT**

大量のLearning Path生成やCourse UIは行わない。

Path候補は次の条件を満たす場合だけ扱う。

1. Cluster Questionへの理解が前進する
2. transitionを既存Relationで説明できる
3. Roleの変化が「次に見る理由」を補強する
4. 一本道が不自然な場合はbranch / optionalを許す
5. prior knowledgeを無視した固定順序へしない

## Path Readiness Score

内部評価：88 / 100。

- Role Grammar Quality: 23 / 25
- Cross-Cluster Reuse: 19 / 20
- Transition Explainability: 17 / 20
- Relation Support: 13 / 15
- User Value: 7 / 10
- Maintenance: 9 / 10

Role構造は十分再利用できるが、実ユーザーのprior knowledgeや探索意図によって有効な順番が変わるため、Pathを固定Courseへする段階ではない。

# Soft Path Derivation Pilot

Path Readinessを確認したうえで、2 ClusterだけにSoft Path Pilotを実装した。

対象：

- `safe-software-change`
- `predictable-interaction`

`data/clusters.json` の `soft_path_pilot` が、対象Cluster、最大候補数、現在Roleから次Roleへの優先順だけを保持する。

**個々のPath edgeは保存しない。**

候補は毎回次の3要素から導出する。

```text
CURRENT CONCEPT
      +
SAME CLUSTER
      +
DIRECT TYPED RELATION
      +
ROLE PRIORITY
      ↓
NEXT 2–3 CANDIDATES
```

候補の順位は、まずRole transitionの優先順を使い、同順位ならcurrent conceptから外向きのtyped relationを優先する。候補の説明文にはRoleの人間向けlabelと既存relation noteを再利用する。

これにより、relation noteを別のPath説明として複製しない。

## Current derivation result

CI上ではPilot対象のRole割当済み14 Conceptすべてで少なくとも1つの次候補を導出できている。

- candidate coverage: `14 / 14 = 100%`
- Technical Debt entry: `Code Smell / Legacy Code / Refactoring`
- Signifier entry: `Discoverability / Conceptual Model / Affordance`

Technical Debtの手書きPilot図と、実データから導出した候補がほぼ一致しているため、Role + Relationからsoft guidanceを作れるという仮説は現在の2 Clusterでは支持されている。

## Soft Path validation

`scripts/audit-clusters.mjs` で次を検査する。

- Pilot対象は2 Clusterに限定
- `max_candidates` は2〜3
- Role優先順は全Roleを重複なく含む
- Pilot対象Cluster IDが存在する
- Pilotのentryから2候補以上導出できる
- Role割当済みPilot memberの80%以上で候補を導出できる

候補coverageが低下した場合、UIへ例外を追加するのではなく、Role / Relation / Pilot Grammarのどこが弱くなったかを確認する。

# Concept Map

Concept MapではCluster専用画面やPath専用画面を作らない。

Focusしている語がClusterに属する場合、中心語の近くへ `CONTEXT · <cluster label>` を表示する。

さらにSoft Path Pilot対象ClusterのRole割当済みConceptだけ、Focus Map下部へ `次に見るなら` を最大3件表示する。

各候補は、

- 次Concept
- 次ConceptのThinking Role
- 既存typed relation noteを使った「なぜ次なのか」

を示す。

このUIは正解順序を示さず、`正解の順番ではなく、今の語から理解を進めやすい候補。` と明示する。

Clusterに属さない語、またはPilot対象外Clusterの語のUIは変えない。

# Adding a cluster

1. Graph auditから候補を見る
2. Field名ではなくQuestion / Thinking Jobで命名する
3. 3〜8語へ絞る
4. `entry` / `anchor` / `boundaries` を決める
5. memberごとの仕事をRole名なしの自然文で観察する
6. 既存Roleが自然に当てはまるConceptだけPrimary Roleを付ける
7. `data/clusters.json` に1回だけ定義する
8. `node scripts/audit-clusters.mjs`
9. Concept Mapで代表Conceptと重複所属Conceptを確認する

Concept側へCluster IDやRoleを追記しない。

# Not yet: stored Learning Paths

Soft Path Pilotを実装しても、Learning Pathをデータとして保存しない。

現在の次の検証対象は「導出できるか」ではなく、**この候補UIが自由探索より実際に役立つか**。

Pilotの価値が弱い場合、Role Grammarは維持してSoft Path UIだけを撤去できる。relationやClusterデータを巻き戻す必要はない。
