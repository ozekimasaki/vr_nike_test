import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'model/**/*',
          dest: 'model'
        }
      ]
    })
  ],
  server: {
    host: true,
    open: true
  }
})

