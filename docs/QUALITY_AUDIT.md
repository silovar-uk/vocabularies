# Vocabulary Quality Audit — 2026-08-10

Vocabulariesの全収録語を、単に「JSONとして正しいか」ではなく、**概念としてどの強さで扱えるか**という観点で監査する。

## 評価軸

1. **Term status** — 定着した専門語か、設計原則か、経験則か、編集上の概念か
2. **Japanese label** — 日本語主表記が自然か、説明訳になりすぎていないか
3. **Source strength** — 一次資料、標準、査読研究、専門機関などで支えられているか
4. **Selection context** — なぜVocabulariesに入れるのかが具体的か
5. **Relations** — 近接語との差を関係として説明できているか

## Grade

- **A — Strong**: 現在の位置づけのまま強く扱える。定義・出典・用途の輪郭が十分。
- **B — Qualified**: 語自体は有効だが、訳語、分野横断、出典、適用範囲のいずれかに注記が必要。
- **C — Editorial**: 標準的な単独専門語としてではなく、編集原理やVocabularies独自のメタ概念として意図的に扱う。

Cは低品質という意味ではない。**専門語と同じ顔をさせないこと自体を品質とする。**

## 全語監査

| Grade | 語 | 判断 |
|---|---|---|
| B | 段階的開示 / Progressive Disclosure | 概念は有効。日本語主表記を「段階的開示」に修正。UI部品そのものではなく開示順序の設計原則と注記。 |
| A | Information Scent | 情報探索・IAで定着。検索・ラベル設計への適用も直接的。 |
| A | Recognition over Recall | Nielsenのヒューリスティックとして位置づけを修正。 |
| A | 視覚的階層 / Visual Hierarchy | デザイン上の基礎概念。顕著性との区別もRelationsで明確。 |
| A | 余白 / Negative Space | 美術・写真・UIを横断でき、Gettyのformal analysisとも整合。 |
| B | 視覚的リズム / Visual Rhythm | 美術・グラフィックでは強い。UIへの適用は視覚構成の応用なので注記を追加。 |
| A | Visibility of System Status | Nielsenのヒューリスティックとして位置づけを修正。 |
| A | 範疇知覚 / Categorical Perception | 古典的実験研究まで出典を強化。 |
| A | 自動性 / Automaticity | 心理学・学習研究で定着。「Automation＝自動化」との違いを明記。 |
| B | 韻律 / Prosody | 音声学では強い専門語。一般文章の「リズム」へ広げる場合は用法の拡張を明記。 |
| A | レジスター / Register | 社会言語学・文体論で定着。 |
| A | Rhetorical Move | Move Analysisの研究系譜へ出典を強化。 |
| A | 認識的スタンス / Epistemic Stance | 「確信度」だけでなくevidentiality・commitmentも含むよう定義を修正。 |
| A | 感情粒度 / Emotional Granularity | 心理学研究に直接対応。Vocabulariesの分化思想とも整合。 |
| A | 音色 / Timbre | ANSI/ASAの音響標準定義へ出典を強化。他領域への比喩利用は注記。 |
| A | 構図 / 構成 / Composition | Getty AATのcomposition概念へ出典を精密化。UIへの利用は応用と注記。 |
| A | 顕著性 / Salience | 心理・認知の定着概念。Visual Hierarchyとの境界も明確。 |
| A | シグニファイア / Signifier | Don Norman自身の資料へ出典を変更。Affordanceとの区別を明確化。 |
| A | テスラーの法則 / Law of Conservation of Complexity | 「法則」ではなく設計上のheuristicとして明示すれば強い。 |
| B | キュレーション / Curation | 美術館・博物館の専門実践から、情報・知識編集へ意味を拡張しているため注記が必要。 |
| C | 選択・除去・強調 | O'Keeffeの制作原理。標準学術語ではなく「編集・制作原理」として残す。 |
| C | 分化 / Differentiation | Vocabularies全体を説明するproject meta。単一分野の専門語としては扱わない。 |
| A | シニフィアン / Signifiant | ソシュール記号論の基本語。UX Signifierとの混同注意が価値。 |
| A | シニフィエ / Signifié | シニフィアンとの対概念として明確。 |
| A | 言語記号 / Signe | 主表記を「言語記号 / シーニュ」へ整理。 |
| A | 記号の恣意性 | ソシュールの中心原理。 |
| A | 言語的価値 | 差異によって価値が定まるというVocabulariesの思想に直結。 |
| A | ラング / パロール | 言語体系と個別使用の基本的区別。 |
| A | 共時態 / 通時態 | 現在の体系と歴史変化を分ける分析軸として有効。 |
| A | アフォーダンス / Affordance | Gibson–Norman系譜を踏まえ、Signifierとの境界を明確化。 |
| A | 発見可能性 / Discoverability | 隠す設計と見つけられる設計の差を扱うのに有効。 |
| A | 概念モデル / Conceptual Model | 局所UIではなくシステム理解を扱う語として強い。 |
| A | 制約 / Constraints | Normanのインタラクション設計原則として有効。 |
| A | 実行の淵 / 評価の淵 | Norman 1986のCognitive Engineeringまで出典を強化。 |
| A | 本質的複雑性 / 偶発的複雑性 | Brooksの区別として明確。Teslerとの「似ているが別」を維持。 |
| A | 認知負荷 / Cognitive Load | 認知負荷理論として強い。単なる「情報量」と同一視しない。 |
| A | 内在的 / 外在的認知負荷 | 認知負荷の由来を分ける区別として有効。Brooksの区分とは別理論。 |

## 今回の実修正

### 表記

- `漸進的開示` → **段階的開示**を主表記に変更
- `自動性 / 自動化` → **自動性**を主表記にし、Automationとの区別を注記
- `ネガティブスペース / 余白` → **余白 / ネガティブスペース**へ日本語優先順を整理
- `記号 / 言語記号` → **言語記号 / シーニュ**へ範囲を明確化

### Formal status

- Recognition over Recall → `heuristic`
- Visibility of System Status → `heuristic`
- Tesler's Law → `heuristic`を維持
- Selection, Elimination, Emphasis → `editorial_principle`
- Differentiation → `project_meta`

### 出典強化

- Signifier → Don Norman, JND
- Categorical Perception → Liberman et al. (1957), *Journal of Experimental Psychology*
- Prosody → Oxford Research Encyclopedia / Oxford Handbook
- Rhetorical Move → *Encyclopedia of Applied Linguistics*
- Epistemic Stance → Biber & Fineganほか学術研究
- Timbre → ANSI/ASA Acoustical Terminology
- Composition → Getty Art & Architecture Thesaurus
- Gulf of Execution / Evaluation → Norman (1986), *Cognitive Engineering*

### Relations補強

監査時に関係が薄かった10語について、単なるリンクではなく「差が一文で分かる関係」を追加した。

- Register → Langue / Parole、Rhetorical Move、Epistemic Stance
- Rhetorical Move → Epistemic Stance、Register、Composition
- Epistemic Stance → Rhetorical Move、Register
- Automaticity → Cognitive Load、Categorical Perception
- Emotional Granularity → Differentiation、Categorical Perception
- Timbre → Prosody、Composition
- Composition → Visual Hierarchy、Negative Space、Visual Rhythm、Curation、Rhetorical Move
- Information Scent → Signifier、Discoverability、Recognition over Recall
- Categorical Perception → Differentiation、Emotional Granularity、Automaticity
- Curation → Selection / Elimination / Emphasis、Composition、Visual Hierarchy

ここでも数を増やすこと自体を目的にせず、**「何が違うか／どの観点が違うか」を説明できる関係だけ**を採用した。

## Readerへの反映

品質上の位置づけは、一覧カードにバッジとして増やさない。

Reader内でのみ、`established_term`以外を小さく表示する。

- 設計原則
- ヒューリスティック
- 編集・制作原理
- この語彙集でのメタ概念

また、拡張的な使い方や混同注意がある語だけ、定義直後に**用法メモ**を表示する。

これにより、通常の閲覧では静けさを保ちつつ、詳しく読むと「どの強さでこの言葉を使ってよいか」が分かる。

## 運用原則

今後の語彙追加では、Validationを通るだけでは収録完了としない。

- Aとして扱うなら、定義と出典が専門的な用法を直接支えること
- Bなら、どこから先が拡張かを`usage_note`で明記すること
- Cなら、標準専門語ではないことを`formal_status`で明示すること
- 似た語がある場合、定義文を増やすよりRelationsで差を示すこと
- 一般辞典より、一次資料・標準・査読研究・専門機関を優先すること

目標は「専門語をたくさん持っているサイト」ではなく、**どの語を、どの強さで信頼して使えばいいかまで分かる語彙集**にすること。
