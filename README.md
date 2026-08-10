# Vocabularies

「うまく言えない差」に、あとから言葉を追いつかせるための語彙集。

専門語を網羅する辞書ではなく、**知ったあとにものの見え方が少し細かくなる語を編集して集める**個人用の知識プロダクトです。

## Concept

> Quiet surface, deep structure.
>
> 表面は静かに、構造は深く。

Vocabularies は「辞書 × 編集された知識誌 × 小さな美術館」の中間を目指しています。

日本語で自然に定着している語は日本語を主表記にし、英語で扱う方が自然な専門語は英語を主表記にします。表記の優先順位も語ごとに編集します。

## Main experience

入口の優先順位は次の通りです。

1. **用語を探す** — 日本語・英語・別名・感覚・分野を横断して順位付き検索
2. **語彙一覧を眺める** — Card 2.0 で定義の入口だけを静かに読む
3. **分野から探す** — 必要なときだけ展開する補助索引
4. **感覚から探す** — 言葉がまだ思い浮かばないときの裏口

検索では、単に一致語を出すだけでなく、シグニファイア / シニフィアンのような**似ているが異なる概念の差**も提示します。

## Reader

語を選ぶと、PCでは右側のReader、スマホでは全面Readerで詳細を読みます。

表示順は原則として、

**定義 → 用法メモ → なぜこの言葉か → Before / After → この言葉のまわり → 発見 → 感覚 → 出典**

です。

関連語には「対概念」「混同注意」「比較」「設計手段」など、**関係そのものの名前**を付けています。

## Discovery

知りたい語を探すだけでなく、偶然の発見も小さく残します。

- **今日の一語** — 日本時間の日付ごとに1語
- **意外な隣接語** — 関係グラフを2歩ほどたどった、少し遠い語
- **3歩だけ寄り道** — 現在語から関係を3回だけたどる短い知識散歩

Discovery は主役にせず、Readerの読後に置く設計です。

## Editorial Intake

新しい語は、思いついた時点で本体データへ入れません。

`editorial.html` で、

**候補 → 調査 → 判定 → 関係 → 採用準備**

の工程を通します。

最初に必要なのは、

- 候補語
- その語を知らなかったために、何をうまく言えなかったか

の2点だけです。

調査が進んだら、A / B / C、formal status、主表記、定義、出典、Relations、Before / Afterを追加します。

編集画面では、

- ブラウザ内への候補保存
- 工程ごとのquality gate
- 調査プロンプト生成
- JSON入出力
- 採用時の `dataset_item / catalog_metadata / relations` bundle生成

ができます。

候補キューは本体の検索データとは分離し、`ready`になった語だけを本体へ移します。

詳細は [`docs/EDITORIAL_INTAKE.md`](docs/EDITORIAL_INTAKE.md) を参照してください。

## Visual principles

- UIを叫ばせず、語そのものを主役にする
- 暖かい白、墨に近い黒、深い緑の3系統を基本にする
- 色で分類せず、タイポグラフィ・余白・罫線で階層を作る
- カードは一覧のため、Readerは読むため、と役割を分ける
- モーションは移動を派手に見せるためではなく、空間的な連続性を保つために使う
- スマホは情報を削るのではなく、一度に知覚させる量を減らす
- `prefers-reduced-motion` を尊重する

## Principles

- 網羅性より「知ったあとに見え方が変わる語」を優先する
- 定義だけでなく、周辺語との差によって概念の輪郭を出す
- 1語ごとに Before → After を置き、実際の言語化に使える状態にする
- 出典を残し、独自解釈だけで意味を固定しない
- 正式な専門語と比喩的な拡張を区別する
- 概念 → データ → 関係 → 体験 → UI の順で育てる

## Repository structure

```text
/
├─ index.html
├─ editorial.html         # 候補語の編集・採用フロー
├─ styles-v3.css          # 現行デザインシステム
├─ catalog.css            # 分野taxonomyの補助レイアウト
├─ editorial.css          # Editorial Intake専用UI
├─ app-v2.js              # Catalog読込・状態・絞り込み・カード
├─ reader.js              # Reader と関係表示
├─ search-v2.js           # 順位付き検索・類似概念の差分提示
├─ discovery.js           # 今日の一語・寄り道
├─ editorial.js           # 編集キュー・quality gate・採用bundle
├─ favicon.svg
├─ data/
│  ├─ catalog.json        # データセット・表記・分類・正式度・検索設計
│  ├─ vocabularies.json
│  ├─ research-20260810-semiotics-complexity.json
│  ├─ meta-vocabularies.json
│  ├─ relations.json
│  └─ intake.json         # Git管理する候補キュー
├─ scripts/
│  ├─ validate-data.mjs
│  └─ validate-intake.mjs
├─ .github/workflows/
│  └─ validate-data.yml   # 本体データ＋編集キューを検証
└─ docs/
   ├─ DATA_SCHEMA.md
   ├─ QUALITY_AUDIT.md
   ├─ EDITORIAL_INTAKE.md
   └─ PLANNING.md
```

## Data model

`data/catalog.json` を語彙集全体の設計図として扱います。

ここで、

- 読み込む語彙データセット
- 日本語 / 英語の主表記
- aliases
- formal_status
- usage_note
- 分野ラベルと上位taxonomy
- 検索時に比較する概念群

を管理します。

語彙本文へ表示上の例外を増やしたり、JSへ個別語をハードコードしたりしないことを基本にします。

詳細は [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) を参照してください。

## Data validation

語彙データまたは編集キューを変更すると、GitHub Actions の **Validate vocabulary data** が自動実行されます。

ローカルでは次で同じ検証を実行できます。

```bash
node scripts/validate-data.mjs
node scripts/validate-intake.mjs
```

本体側ではID重複、必須項目、出典、formal status、taxonomy、Relationsなどを検証します。

Editorial Intake側では、工程が進むほど必須項目を増やします。たとえば、調査以降は出典、判定以降はA/B/Cと定義、関係以降はRelations、採用準備以降はBefore / Afterと選定背景が必要です。

## Current design system

主要トークンは、

- color: `--bg`, `--ink`, `--muted`, `--accent`
- radius: `--radius-control`, `--radius-card`, `--radius-small`
- type: `--text-xs`, `--text-sm`, `--text-body`, `--text-lead`, `--text-title`
- motion: `--motion-fast`, `--motion-medium`, `--motion-panel`, `--motion-ease`

です。

見た目を変更するときは、個別セレクタを後段で上書きするより、まずこのトークンと既存の階層設計を確認します。

## Development direction

次の重点は、機能数より**語彙コレクションとしての質と編集運用**です。

1. Editorial Intakeから実際の新語採用を回して工程を検証する
2. Relations の関係タイプと説明を精密化する
3. formal_status / usage_note の精度を語彙ごとに監査する
4. 語彙数が増えてもValidationを通る状態を維持する
5. モバイル実機でのReader・検索・Discoveryを継続的に磨く

詳細な初期計画は [`docs/PLANNING.md`](docs/PLANNING.md) に残しています。
