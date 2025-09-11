import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import fs from 'node:fs'
import path from 'node:path'

function readDevVarsModelUrl(rootDir) {
  try {
    const devVarsPath = path.join(rootDir, '.dev.vars')
    if (!fs.existsSync(devVarsPath)) return undefined
    const text = fs.readFileSync(devVarsPath, 'utf-8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^MODEL_URL\s*=\s*(.+)$/)
      if (m) return m[1].trim()
    }
  } catch {}
  return undefined
}

export default defineConfig(({ command, mode }) => {
  const rootDir = process.cwd()
  const defineValues = {}
  let devProxy = undefined

  if (command === 'serve') {
    // 1) 優先: .dev.vars の MODEL_URL
    const modelFromDevVars = readDevVarsModelUrl(rootDir)
    if (modelFromDevVars) {
      defineValues['import.meta.env.VITE_MODEL_URL'] = JSON.stringify(modelFromDevVars)
      try {
        const u = new URL(modelFromDevVars)
        devProxy = {
          '/model.glb': {
            target: `${u.protocol}//${u.host}`,
            changeOrigin: true,
            secure: true,
            rewrite: () => u.pathname
          }
        }
      } catch {}
    } else {
      // 2) 代替: Vite の .env.* から VITE_MODEL_URL
      const env = loadEnv(mode, rootDir, '')
      if (env.VITE_MODEL_URL) {
        defineValues['import.meta.env.VITE_MODEL_URL'] = JSON.stringify(env.VITE_MODEL_URL)
        try {
          const u = new URL(env.VITE_MODEL_URL)
          devProxy = {
            '/model.glb': {
              target: `${u.protocol}//${u.host}`,
              changeOrigin: true,
              secure: true,
              rewrite: () => u.pathname
            }
          }
        } catch {}
      }
    }
  }

  return ({
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
  define: defineValues,
  server: {
    host: true,
    open: true,
    proxy: devProxy
  }
  })
})

