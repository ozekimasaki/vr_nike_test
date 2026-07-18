# ar-nike-vr-demo

React + [A-Frame](https://aframe.io/) 製の WebVR デモです。3D モデル（GLB）を配置したシーン内を歩き回り、視線（ゲイズ）またはマウスで 3D ボタンを操作してモデルの召喚・回転・退場などを行えます。本番配信は Cloudflare Workers 上で行い、モデルファイルは R2 バケットから Worker 経由でトークン保護付きに配信します。

## 主な機能

- **A-Frame VR シーン**: 床・壁・ライティング（ambient / hemisphere / directional）・影付きのシーン（`src/App.tsx`）。
- **モデルの読み込みと表示**: `a-asset-item#modelGLB` として GLB を読み込み、読み込み完了までローディングオーバーレイを表示。
- **3D ボタン操作**（`src/main.js`）:
  - `SUMMON`: モデルを召喚し、上空から落下させながらマテリアルをフェードイン。
  - `ROTATE`: モデルの Y 軸回転を開始（基準速度 90deg/sec）。
  - `速度UP`: 回転速度を段階的に加速（上限 2880deg/sec）。
  - `STOP`: 回転停止して姿勢をリセット。
  - `VANISH`: 上方向へフェードアウトしながらモデルを退場。
- **移動・操作**: `wasd-controls` による移動、`look-controls` による視点操作、スペースキーでジャンプ。移動範囲は `clamp-position` コンポーネントで床の内寸に制限。
- **カーソルモード**: 既定は視線（fuse）カーソル。URL クエリ `?mouse=1` でマウス/タッチのレイカーソルに切替。
- **iOS モーションセンサー許可**: `DeviceMotionEvent` / `DeviceOrientationEvent` の許可が必要な端末では「センサー許可」ボタンを表示。
- **デバッグ表示**: URL クエリ `?debug=1` でレイキャスターのラインとクリックログを有効化。
- **Cloudflare Worker 配信**（`src/worker.js`）: 静的アセット配信、HTML への 5 分有効の HMAC トークン注入、R2 からの `/model.glb` プロキシ（同一オリジンチェック付き）、SPA フォールバック。

## 要件

- Node.js（`vite@5` / `typescript@5` が動作するバージョン）と npm。
- Cloudflare へデプロイする場合: Cloudflare アカウントと [`wrangler`](https://developers.cloudflare.com/workers/wrangler/)（devDependency として同梱）、R2 バケット。

## インストール

```bash
npm install
```

## 使い方

### 開発サーバー

```bash
npm run dev
```

Vite の開発サーバーが起動しブラウザが開きます。開発時のモデル配信については以下を参照してください。

- モデルは `/model.glb` として参照されます。開発サーバーでは `vite.config.js` が以下の優先順位で `MODEL_URL` を解決し、`/model.glb` をそのオリジンへプロキシします。
  1. プロジェクト直下の `.dev.vars` に書かれた `MODEL_URL`
  2. Vite の env ファイル（`.env.*`）の `VITE_MODEL_URL`
- ローカルの `model/` ディレクトリが存在する場合は `vite-plugin-static-copy` により開発時のみ `model/` 配下がコピーされます（本番ビルドには含まれません）。

### 本番ビルド / プレビュー

```bash
npm run build     # dist/ へ本番ビルド
npm run preview   # ビルド結果をローカルでプレビュー
```

### 型チェック

```bash
npm run typecheck   # tsc --noEmit
```

### Cloudflare Workers（開発・デプロイ）

```bash
npm run cf:login    # wrangler login
npm run cf:dev      # wrangler dev（Worker をローカル実行）
npm run cf:deploy   # npm run build 後に wrangler deploy
```

`wrangler.toml` の主な設定:

- `main = "src/worker.js"`、`[assets] directory = "dist"`（ビルド成果物を配信）。
- `[[r2_buckets]]` バインディング `R2_BUCKET`（バケット名 `dev`）。
- ルート `vr-test.umaibo.dev/*`（zone `umaibo.dev`）。

Worker が参照する環境変数・シークレット（`src/worker.js`）:

- `MODEL_TOKEN_SECRET`: HTML へ注入する HMAC トークンの署名鍵。`wrangler secret put MODEL_TOKEN_SECRET` で設定。未設定の場合はトークンを注入しません。
- `MODEL_OBJECT_KEY`: R2 上のモデルオブジェクトキー（既定値 `nikechan_v2_outerwear_converted.glb`）。

> シークレット類（`MODEL_TOKEN_SECRET` など）は `wrangler secret put` で設定してください。`.dev.vars` / `.env*` は `.gitignore` 済みです。

## 構成

```
.
├── index.html            # エントリ HTML（#root と /src/main.tsx を読み込み）
├── src/
│   ├── main.tsx          # React エントリ。A-Frame を読み込み App をマウント後、main.js を動的 import
│   ├── App.tsx           # a-scene と UI オーバーレイを描画する React コンポーネント
│   ├── main.js           # A-Frame の命令的ロジック（clamp-position、ボタン処理、アニメーション）
│   ├── worker.js         # Cloudflare Worker（アセット配信・トークン注入・R2 モデルプロキシ・SPA フォールバック）
│   ├── style.css         # スタイル（ローディングオーバーレイ等）
│   └── aframe-jsx.d.ts   # A-Frame タグ用の JSX IntrinsicElements 型宣言
├── vite.config.js        # Vite 設定（開発時の MODEL_URL 解決・プロキシ・静的コピー）
├── tsconfig.json         # TypeScript 設定（noEmit、strict、react-jsx）
├── wrangler.toml         # Cloudflare Workers 設定（assets / R2 / routes）
└── package.json
```

## ライセンス

`package.json` は `"private": true` で、ライセンスは指定されていません。
