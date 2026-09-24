# BREAK THROUGH

スマートフォン縦画面向けの短編インクリメンタル破壊ゲーム（Phaser 4 + TypeScript + Vite）。
BREAK を押すと BREAK CORE が壁を連続でぶち抜き、止まった壁の「あと何%」を見て強化し、もう一度突破する。

現在は **PHASE 1**（WALL 1〜20、倉庫→工場）を実装。

**▶ プレイ:** https://kousintyo2-dotcom.github.io/break-the-rock/ （`main` にマージ後、GitHub Pages に自動公開）

## Play loop

1. **BREAK** — CORE が右へ発射され、自動で壁を連続破壊
2. POWER が尽きると壁に食い込んで停止（`WALL 7 / 67% / 33% TO BREAK`）
3. 結果パネルで SCRAP を使い POWER / MOMENTUM / LUCK を強化（EST. 突破予測が伸びる）
4. **BREAK AGAIN** — さっき止められた壁を突破する

BEST 5 / 10 / 15 / 20 到達で特殊強化3択。10連続突破で BREAK RUSH。

## Development

```bash
npm install
npm run dev        # http://localhost:5173/break-the-rock/
npm run typecheck
npm test
npm run build
node --experimental-strip-types tools/simulate-progress.ts   # 序盤10分のバランス確認
```

`?reset` を URL に付けるとセーブを消去して起動（設定画面にも RESET SAVE あり）。

## Structure

- `src/config/tuning.ts` — 壁以外のバランス値（POWER/MOMENTUM/LUCK 成長、価格、RUSH 条件、クリティカル、特殊壁・特殊強化の効果量）
- `src/config/feel.ts` — 演出速度・カメラ・ヒットストップ・画面揺れ・レイアウト
- `src/data/` — 壁コース（耐久・報酬・特殊壁配置）、素材ごとの破片/音、特殊強化、アセット定義
- `src/systems/` — ルール（純粋関数）：ステータス計算、RUN の事前シミュレーション、強化、進行
- `src/save/` — バージョン付きセーブと検証/デフォルト補完
- `src/scenes/` — `BootScene`（読み込み・破片フレーム生成）、`GameScene`（唯一のゲームシーン、RUN の再生）
- `src/entities/`, `src/effects/`, `src/ui/`, `src/audio/` — 表示・演出・UI・WebAudio 合成 SE

`GameScene` は RUN 結果を `simulateRun` で先に確定し、それを演出として再生するだけ。ルールはテスト可能な純粋関数に閉じている。

## Assets

`art/source/` に支給スプライトシート原本、`tools/extract-assets.py` でマゼンタ透過・切り出しを行い `public/assets/` に出力。
PHASE 1 未使用素材（CORE 第3/4形態、特殊壁、THE WALL、研究施設/異常領域背景）も切り出し済み。

## GitHub Pages

`main` への push で `.github/workflows/deploy-pages.yml` がテストとビルドを実行し `dist` を公開（`base: /break-the-rock/`）。
