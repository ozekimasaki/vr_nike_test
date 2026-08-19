# AGENTS.md

このリポジトリでコーディングエージェントが作業する際のガイドです。React + A-Frame 製の WebVR デモ（`ar-nike-vr-demo`）で、Cloudflare Workers + R2 で配信します。

## プロジェクト構成 / エントリポイント

- `index.html`: ブラウザのエントリ。`#root` を用意し `/src/main.tsx` を module として読み込む。
- `src/main.tsx`: React エントリ。`import 'aframe'` で A-Frame を先に読み込み、`App` を `#root` にマウントした後、`requestAnimationFrame` 内で `./main.js` を動的 import する。
- `src/App.tsx`: `a-scene` とシーン内エンティティ（床・壁・ライト・カメラリグ・3D ボタン群）、および HTML オーバーレイ（ローディング、iOS センサー許可ボタン）を描画する React コンポーネント。
- `src/main.js`: A-Frame の命令的ロジック。カスタムコンポーネント `clamp-position` の登録、`SUMMON` / `ROTATE` / `速度UP` / `STOP` / `VANISH` ボタンのイベント処理、召喚アニメーション、ジャンプなど。DOM 要素は id（`summonButton3D` など）で取得している。
- `src/worker.js`: Cloudflare Worker の `fetch` ハンドラ。静的アセット配信、HTML への HMAC トークン注入（有効 5 分）、R2 からの `/model.glb` プロキシ（同一オリジン/`Sec-Fetch-*` チェック付き）、SPA フォールバック。
- `src/style.css`: スタイル（ローディングオーバーレイ等）。
- `src/aframe-jsx.d.ts`: `a-scene` などの A-Frame タグを JSX で使うための `IntrinsicElements` 型宣言。
- 設定: `vite.config.js`（開発時の `MODEL_URL` 解決・`/model.glb` プロキシ・`model/` の静的コピー）、`tsconfig.json`、`wrangler.toml`、`package.json`。

## セットアップ

```bash
npm install
```

Node.js（`vite@5` / `typescript@5` が動くバージョン）と npm が必要。Cloudflare 連携には同梱の `wrangler` を使用する。

## ビルド / テスト / lint / typecheck コマンド

`package.json` の `scripts` に定義された実在コマンドのみ:

- `npm run dev`: Vite 開発サーバー（`vite --open`）。
- `npm run build`: 本番ビルド（`vite build` → `dist/`）。
- `npm run preview`: ビルド結果のプレビュー（`vite preview --host`）。
- `npm run typecheck`: 型チェック（`tsc --noEmit`）。
- `npm run cf:dev`: `wrangler dev`。
- `npm run cf:deploy`: `npm run build` 後に `wrangler deploy`。
- `npm run cf:login`: `wrangler login`。

**注意**: テスト用スクリプトや lint 用スクリプトは定義されていない。変更後は最低限 `npm run typecheck` と `npm run build` が通ることを確認すること。存在しないコマンド（`npm test`、`npm run lint` 等）を案内・実行しないこと。

## コーディング規約

- TypeScript は `strict: true`。`tsconfig.json` は `noEmit`、`jsx: react-jsx`、`allowJs: true`、`moduleResolution: Bundler`。
- インデントは 2 スペース、文末セミコロンなし、シングルクォートが既存の主流。周囲のスタイルに合わせる。
- 既存コードのコメントは日本語。新規コメントも日本語で、必要な箇所のみ簡潔に。
- A-Frame の DOM 操作は id ベース（`document.getElementById('summonButton3D')` 等）。id を変更する場合は `App.tsx` と `main.js` の双方を同期させること。
- 新しい A-Frame タグを JSX で使う場合は `src/aframe-jsx.d.ts` の `IntrinsicElements` に追加する。
- `App.tsx` は宣言的な React／シーン記述、`main.js` は命令的な A-Frame ロジック、という役割分担を踏襲する。

## 注意点

- **シークレットを扱わない**: `.dev.vars` / `.env*` は `.gitignore` 済み。コミットしないこと。Cloudflare のシークレット（`MODEL_TOKEN_SECRET` など）は `wrangler secret put` で設定する想定。
- **環境変数**: 開発時のモデル配信は `MODEL_URL`（`.dev.vars`）または `VITE_MODEL_URL`（`.env.*`）で解決され、`/model.glb` がそのオリジンへプロキシされる（`vite.config.js`）。Worker 側は `MODEL_TOKEN_SECRET` と `MODEL_OBJECT_KEY`（既定 `nikechan_v2_outerwear_converted.glb`）、`R2_BUCKET` バインディングを参照する。
- **モデルファイル**: GLB は本番ビルド（`dist/`）に含めず、Worker が R2 から配信する。`model/` ディレクトリは開発時のみ `vite-plugin-static-copy` でコピーされる。
- **バンドルサイズ**: A-Frame を含むため本番の JS チャンクが大きい（ビルド時に 500kB 超の警告が出るが既知）。
- **UI/UX やバージョンの無断変更を避ける**: 技術スタックのバージョン変更や見た目の大きな変更は、必要理由を明示して最小限に留める。
- 変更は要求されたファイルに限定し、無関係なファイルには触れないこと。
