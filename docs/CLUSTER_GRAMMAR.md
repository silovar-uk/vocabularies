# Concept Cluster / Role / Soft Path Grammar

Vocabulariesでは、知識構造を次の階層として扱う。

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

重要なのは、下の階層ほど「機能を増やす」のではなく、上にある意味構造を別の角度から読めるようにすること。

## Source of truth

Cluster定義、Role Grammar、Soft Path Pilot設定の正本は `data/clusters.json`。

Concept本体へ `clusters` や固定Roleを重複保存しない。Soft Pathのedgeや順番も保存しない。

---

# Concept Cluster

Clusterは分野・カテゴリ・タグではない。

**一つの問いを考えるために、一緒に読む意味があるConceptのまとまり**として扱う。

例：

- Field: `Software Engineering`
- Cluster: `安全にソフトウェアを変更する`

Fieldは「どの領域の語か」。Clusterは「何を考えるために一緒に読むか」。

## Current cluster schema

- `id` — 安定した識別子
- `label` — 読む理由が伝わる名前
- `question` — 中心となる問い
- `description` — なぜ一緒に読むのか
- `members` — 主要Concept。3〜8語
- `entry` — 入り口に向くConcept
- `anchor` — 代表Concept
- `boundaries` — 隣の問いへつながりやすいConcept
- `roles` — Cluster内でのPrimary Thinking Role

Graph上で密な集合を、そのままClusterとはみなさない。`scripts/audit-clusters.mjs` のGraph分析は候補発見であり、編集上の真実ではない。

採用には少なくとも、問いとして説明できること、Fieldとの差があること、一緒に読む実用的理由があることを求める。

## Current clusters

| Cluster | Question |
| --- | --- |
| 安全にソフトウェアを変更する | 既存の振る舞いを壊さず、変更コストを下げながら変え続けるには？ |
| 次の操作を予測できるUIをつくる | 人は何を手掛かりに、何ができ、その結果をどう予測するのか？ |
| 記号が意味を持つ仕組みを考える | 言葉や記号は差異と関係の中でどう意味を持つのか？ |
| 頭の外へ思考を逃がす | 情報や操作を外部へ置くと、なぜ考えやすくなるのか？ |
| 複雑さをどこへ置くか | 消せない複雑さをどこへ移すと理解と操作の負担が減るか？ |
| 情報を増やさず、見え方を設計する | 何を残し、引き、目立たせると視線と意味の順序が生まれるか？ |

---

# Concept Role Grammar

Relationは「AとBがどうつながるか」。

Verb Familyは「その関係をどんな思考操作として読むか」。

Clusterは「どんな問いを考えるために一緒に読むか」。

Roleは**その問いを理解する中でConceptがどんな仕事をするか**。

RoleはConcept自体の固定属性ではなく `Concept × Cluster` の関係。

## Current roles

| Role | Thinking Job |
| --- | --- |
| `DIAGNOSE` | 曖昧な違和感を、観察できる問題として見えるようにする |
| `MODEL` | 原因・構造・成立の仕組みを説明する |
| `DISTINGUISH` | 似た概念や原因を切り分ける |
| `INTERVENE` | 方法・安全網・設計レバーを与える |
| `EVALUATE` | 状態や介入結果を見る評価軸を与える |

`SIGNAL` は `DIAGNOSE`、`SUPPORT` は `INTERVENE`、`CONTEXT` は `MODEL` へ統合した。分類数を成果にしない。

## Navigation metadataとの分離

`entry` / `anchor` / `boundaries` はThinking Roleではない。

- `entry` — どこから入りやすいか
- `anchor` — 何を代表として扱うか
- `boundaries` — どこから隣の問いへ出やすいか

これらは読む経路のmetadataとして維持する。

RoleなしConceptは許可する。coverage 100%を目的にしない。

---

# Soft Path Pilot

Role GrammarとRelationから「次に見ると理解を進めやすい候補」を導出する小規模Pilot。

対象は2 Clusterだけ。

- `safe-software-change`
- `predictable-interaction`

固定Learning Pathは保存しない。

```text
CURRENT CONCEPT
      +
SAME CLUSTER
      +
DIRECT TYPED RELATION
      +
ROLE PRIORITY
      ↓
NEXT CANDIDATES
```

`data/clusters.json` の `soft_path_pilot` が保持するのは、対象Cluster、候補上限、Role Priorityだけ。

## Path Readiness

Role Grammar検証では、Pilot対象14 Conceptすべてで直接relationを使った次候補を導出できた。

ただし、**candidate coverageはUser Valueではない**。

候補が生成できることと、候補が選びやすいこと、連続して読むと理解が進むことは分けて評価する。

---

# Soft Path User Value Audit — 2026-09-01

判定：**MODIFY**

Soft Pathそのものは残すが、初期Pilotの表示・順位付けをそのままKEEPしない。

## Evidence level

今回確認できたのは次の範囲。

1. Structural evidence — あり
2. Expert heuristic review — あり
3. Scenario walkthrough — あり
4. Actual behavior data — なし
5. User interview / usability test — なし

したがって「ユーザーの理解が改善した」とはまだ結論しない。

## Main findings

### 1. 3候補は出せるが、出す必要はなかった

初期Pilotは最大3件を同じ強さで表示していた。

候補の意味自体は概ね妥当だったが、「次に何を見るか」を助けるUIとしては選択肢を圧縮する方が目的に合う。

現在は **最大2候補** とする。

1候補だけでは一本道感が強く、3候補では既存relation一覧との差が薄くなる。2候補を「案内」と「探索自由」の中間として採用する。

### 2. Roleは内部構造として価値があるが、表面へ出す必要はない

初期表示：

```text
変える手掛かりを与える
Refactoring
「変える手掛かりを与える」方向へ進む。…
```

Role Grammarの説明が前面に出ており、ユーザーが知りたい具体的関係より抽象度が高かった。

現在は **Relation-first** とする。

```text
改善手段
Refactoring
内部構造を小さく安全に改善し、将来の変更コストを下げる代表的な手段。
```

Roleは候補順位の内部ロジックにだけ使い、UIでは既存Human Relation Labelとrelation noteを再利用する。

新しいPath専用説明文を保存しない。

### 3. 局所ランキングは即往復を生んだ

初期Pilotで1位だけを辿ると、代表的に次の即時loopが起きた。

```text
Technical Debt
→ Code Smell
→ Technical Debt
```

```text
Conceptual Model
→ Feedforward
→ Conceptual Model
```

どちらもrelationとしては正しい。しかし「次へ進む案内」としては弱い。

現在は、**直前に見ていたConceptを候補から削除せず、順位だけ下げる**。

比較のために戻る自由は残しつつ、代替候補がある場合は新しい方向を先に出す。

すべての循環を禁止しない。Concept MapはCourseではなく探索UIなので、数step後に戻ること自体は問題としない。

### 4. Mobileでは案内をrelation一覧より先に置く

Desktopではincoming / focus / outgoingの全体像とSoft Pathを同時に読みやすい。

Mobileではrelation一覧をすべて読んだ後にSoft Pathを置くと、案内として遅い。

820px以下では次の順とする。

```text
FOCUS CONCEPT
↓
NEXT 2 CANDIDATES
↓
INCOMING RELATIONS
↓
OUTGOING RELATIONS
```

Soft Pathはrelation一覧を置き換えず、「まずどこへ行けばよいか」の圧縮層として働く。

## Copy decision

3案を比較した。

### A. Role-first — rejected

内部Grammarを説明しすぎる。抽象的で機械的に見えやすい。

### B. Relation-first — adopted

既存Human Relation Labelとnoteをそのまま使える。現在Conceptと候補の具体的関係が最短で分かる。

### C. Question-first — deferred

魅力はあるが、各edge向けの新しい問い文を生成・保存すると説明の二重管理になりやすい。現時点では追加しない。

## Current UI rule

Pilot対象Conceptだけ、Concept Mapに `次に見るなら` を表示する。

- 最大2候補
- Human Relation Label
- Concept名
- 既存relation note
- 「正解の順番ではない」ことを明示
- 直前Conceptは候補から削除せず順位を下げる

Pilot対象外ConceptのUIは変えない。

## Novice / Expert

Noviceには、relationを全部読む前に2候補へ圧縮する価値がある可能性が高い。

Expertには一本道を強制せず、incoming / outgoing / Verb Family routeを引き続き自由に使えることを優先する。

Soft Pathを唯一のNavigationにしない。

## Accessibility / interaction

候補はbuttonとして既存keyboard flowへ入る。

Keyboard activation後は従来どおり新しいfocus conceptへ移動する。色だけに意味を依存せず、候補にはrelation labelと文章を表示する。

新しいanimationやmodalは追加しない。

---

# Validation

`scripts/audit-clusters.mjs` では、Cluster / Role / Soft Pathの構造を検査する。

Cluster:

- ID / label / questionの重複
- 未知Concept
- member数
- entry / anchor / boundary
- relation density

Role:

- Role definition
- 未知Role
- Cluster外assignment
- Role再利用性
- Role coverage

Soft Path:

- Pilot対象は2 Cluster
- 候補上限は2〜3の小さい範囲
- Role Priorityは全Roleを重複なく含む
- Pilot Clusterが存在する
- entryから複数候補を導出可能
- Pilot memberの80%以上で候補を導出可能

UI側ではさらに、直前Conceptを順位降格することで即往復を抑える。

---

# What we are not building

現時点では作らない。

- Stored Learning Path
- Course / Lesson / Chapter
- Progress / Complete
- Quiz / Gamification
- AI recommendation
- Path専用ページ
- Role専用ページ
- 新しいGraph library
- 新dependency

Soft Pathは「次にこれを見ると理解が進みそう」を助けるsoft guidanceであり、正解順序ではない。

---

# Expansion gate

現在の2 Clusterで価値が確認できるまで、残り4 Clusterへ自動展開しない。

次の展開判断では、少なくとも以下を見る。

- candidate coverage
- top candidateの意味品質
- immediate backtrackの抑制度
- explanation quality
- mobileでの情報量
- free explorationとの共存
- 実際に候補が使われるか

最後の項目だけは、構造監査では証明できない。

次の検証は新しいKnowledge Layerの追加ではなく、**実利用でSoft Pathが選択を助けるか**を観察すること。
