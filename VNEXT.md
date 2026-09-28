# Vocabularies vNext

更新: 2026-09-28

## North Star

Vocabulariesは「専門語を増やす単語帳」ではなく、自分がまだ持っていない観察軸・問いを発見し、既存概念との関係を育てる知的道具とする。

価値単位は Term だけではなく Observation Lens / Question。

## 成功条件

- 語数ではなく、異なるObservation Lensが増える。
- 新語を追加しなくても、既存語間の意味ある接続が増えれば成功とする。
- 各語について「この語を消したら、どんな問いが失われるか」を説明できる。
- 分野が異なるだけで観察軸が同じ語を水増ししない。

## 編集操作

### ADD
新しいObservation Lensを生む語を追加する。

### CONNECT
新語を追加せず、既存語間のsemantic relationまたは共有Lensを追加する。

### GARDEN
重複、孤立語、肥大cluster、弱いsource、relation不足、Lens重複を整理する。

## データ原則

- `data/observation-lenses.json` をObservation Lensのsource of truthとする。
- A/B/C/Dのsemantic distanceは語の恒久属性ではなく、追加時点の `admission_review` として扱う。
- `catalog.json` は将来的に手動編集対象から外し、source datasetsから生成する。
- 既存データは一括migrationせず、直近語から段階的にLensを付与する。

## UI原則

トップページの問いは「どの単語を読む？」ではなく「今日は、どの見方を増やす？」。

主要入口:

1. 未知へ行く — 現在の意味空間から遠いLensへ。
2. 仕事で使う — 実務上の曖昧な問題からLensへ。
3. 違和感から探す — 自然語の違和感から概念へ。
4. 地図を見る — Observation Spaceを俯瞰する。

語彙カードでは定義より、以下を優先する。

- 新しく見るもの
- 使える問い
- Before → After
- 近い語との違い
- 関連Lens

## Exploration

従来のExploration Debtは編集補助として維持する。Frontier自体を追加理由にしない。

次段階では Question Coverage Debt を導入し、「語が少ない領域」ではなく「まだ持っていない問い」を探索対象にする。

## 運用

### EXPLORE
20〜40候補を調査しても、追加は0〜2語でよい。

### INTEGRATE
新語よりrelation、Lens、contrastを整える。

### GARDEN
定期的にduplicate、orphan、source、cluster、Lensを監査する。

## 実装フェーズ

### P0
- Observation Lens schema導入
- source of truth整理
- 追加時のADD / CONNECT / REJECTを記録できる構造
- catalog手動同期問題の解消方針を固定

### P1
- 直近50語へLensを段階付与
- Lensから語へ入れるUI
- Term Cardへ「使える問い」を追加

### P2
- Observation Lens Map
- Question Coverage Debt
- CIによるcatalog / annotation / audit / semantic-space生成

## 判断基準

「単語を増やしやすくなったか」ではなく、

> 自分がまだ持っていない見方を発見しやすくなったか。

で評価する。
