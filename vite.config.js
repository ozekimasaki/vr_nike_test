import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  // 開発サーバー時のみモデルをコピー（本番ビルドでは含めない）
  plugins: [
    react(),
    ...(command === 'serve' ? [
      viteStaticCopy({
        targets: [
          {
            src: 'model/**/*',
            dest: 'model'
          }
        ]
      })
    ] : [])
  ],
  server: {
    host: true,
    open: true
  }
}))

