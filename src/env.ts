declare const importMetaEnv: { VITE_MODEL_URL?: string } & ImportMeta['env']

export function setupModelUrlForDev(): void {
  if (typeof window === 'undefined') return
  // Vite 環境変数から注入（wrangler dev では Worker が注入）
  const viteModelUrl = (import.meta as any).env?.VITE_MODEL_URL as string | undefined
  if (viteModelUrl && !window.MODEL_URL) {
    try {
      const u = new URL(viteModelUrl)
      // DevではCORSを避けるためローカルプロキシへ差し替え
      window.MODEL_URL = '/__r2_model.glb'
    } catch {
      window.MODEL_URL = viteModelUrl
    }
  }
}


