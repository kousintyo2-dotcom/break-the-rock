# BREAK THE ROCK

スマートフォン向けの収集型インクリメンタル発掘ゲーム。岩を砕き、画面上へ落ちた発見物を自分の手で回収し、調査道具とコレクションを育てます。

## Play loop

1. **HOME** で岩をタップ（または「岩を叩く」）
2. 物理的に飛び出して静止した発見物をタップして回収
3. **コレクション** で発見記録を確認
4. 獲得した調査資金を **強化** で道具へ投資

進行状況はブラウザの LocalStorage に自動保存されます。

## Development

```bash
npm install
npm run dev
```

品質チェック:

```bash
npm run typecheck
npm test
npm run build
```

## Architecture

- `src/data`: 型付きコンテンツとバランス値
- `src/scenes`: HOME・強化・コレクションの独立画面
- `src/systems`: ゲームルールと状態遷移
- `src/entities`: ドロップ品などのゲームオブジェクト
- `src/effects`: 音・パーティクルなど短命な演出
- `src/save`: バージョン付き永続化スキーマ
- `src/ui`: アプリシェルと共通UI
- `src/assets`: スタイルと将来の素材置き場

Canvas ベースの軽量な自前ランタイムを採用しています。現在の縦切り版では Phaser のシーン・物理・アセットパイプラインが不要な規模であり、モバイルでの初期転送量と長期的なフレームワーク依存を抑えるためです。ルール、データ、描画は分離しており、規模が拡大した際には描画層のみ Phaser へ移行できます。

## GitHub Pages

`main` への push で `.github/workflows/deploy-pages.yml` がテストとビルドを実行し、`dist` を GitHub Pages へ公開します。リポジトリの **Settings → Pages → Source** は **GitHub Actions** を選択してください。
