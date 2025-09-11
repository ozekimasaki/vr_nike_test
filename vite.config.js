import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  // 開発サーバー時のみモデルをコピー（本番ビルドでは含めない）
  plugins: command === 'serve' ? [
    viteStaticCopy({
      targets: [
        {
          src: 'model/**/*',
          dest: 'model'
        }
      ]
    })
  ] : [],
  server: {
    host: true,
    open: true
  }
}))

