export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- Token helpers ---
    async function importHmacKey(secret) {
      const enc = new TextEncoder()
      return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
    }
    function b64url(bytes) {
      let str = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }
    function b64urlFromString(str) {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }
    function stringFromB64url(b64) {
      const pad = '='.repeat((4 - (b64.length % 4)) % 4)
      const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
      return atob(s)
    }
    async function signPayload(secret, payloadStr) {
      const key = await importHmacKey(secret)
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadStr))
      return b64url(sig)
    }
    async function issueToken(secret, req) {
      const now = Date.now()
      const expMs = now + 5 * 60 * 1000 // 5 minutes
      const payload = { exp: expMs }
      const payloadStr = JSON.stringify(payload)
      const token = b64urlFromString(payloadStr) + '.' + await signPayload(secret, payloadStr)
      return token
    }
    async function verifyToken(secret, req, token) {
      if (!token || !token.includes('.')) return false
      const [p, s] = token.split('.')
      let payloadStr
      try {
        payloadStr = stringFromB64url(p)
      } catch (_) { return false }
      let payload
      try {
        payload = JSON.parse(payloadStr)
      } catch (_) { return false }
      if (!payload || typeof payload.exp !== 'number') return false
      if (Date.now() > payload.exp) return false
      const expected = await signPayload(secret, payloadStr)
      return expected === s
    }
    function getCookie(req, name) {
      const cookie = req.headers.get('Cookie') || ''
      const m = cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
      return m ? decodeURIComponent(m[1]) : ''
    }

    // Protected proxy: serve model via Worker only
    if (url.pathname === '/model.glb') {
      try {
        const secret = env.MODEL_TOKEN_SECRET
        if (!secret) return new Response('Server not configured', { status: 500 })
        const token = url.searchParams.get('t') || ''
        const ok = await verifyToken(secret, request, token)
        if (!ok) return new Response('Forbidden', { status: 403 })
        const objectKey = env.MODEL_OBJECT_KEY || 'nikechan_v2_outerwear_converted.glb'
        const object = await env.R2_BUCKET.get(objectKey)
        if (!object) return new Response('Not Found', { status: 404 })
        const headers = new Headers()
        headers.set('Cache-Control', 'private, max-age=0, no-store')
        headers.set('Content-Type', object.httpMetadata?.contentType || 'model/gltf-binary')
        return new Response(object.body, { status: 200, headers })
      } catch (e) {
        return new Response('R2 error', { status: 500 })
      }
    }

    // (Removed) Explicit token endpoint to avoid exposing tokens via JSON
    // Try to serve static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      // HTMLなら常にトークン注入を試みる（Acceptやパスに依存しない）
      const isHtml = assetResponse.headers.get('Content-Type')?.includes('text/html')
      if (isHtml) {
        let html = await assetResponse.text();
        const secret = env.MODEL_TOKEN_SECRET
        const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
        let injected = '0'
        let hasSecret = secret ? '1' : '0'
        if (secret) {
          const token = await issueToken(secret, request)
          const inject = `<script>(function(){var t='${token.replace(/'/g, "\\'")}';window.M_T=t;console.log('[worker] token injected len=',t.length);})();<\/script>`
          html = html.replace(/<\/head>/i, `${inject}\n  </head>`)
          html = html.replace(/src="\/model\.glb"/g, `src="/model.glb?t=${token}"`)
          injected = '1'
        } else {
          const injectDbg = `<script>console.warn('[worker] MODEL_TOKEN_SECRET missing; no token injected');<\/script>`
          html = html.replace(/<\/head>/i, `${injectDbg}\n  </head>`)
        }
        headers.set('X-Token-Injected', injected)
        headers.set('X-Token-HasSecret', hasSecret)
        return new Response(html, { status: 200, headers })
      }
      return assetResponse;
    }

    // SPA fallback: serve index.html for navigations
    
    if (request.method === 'GET') {
      const accept = request.headers.get('Accept') || '';
      const isHtmlRequest = accept.includes('text/html');
      const path = url.pathname || '/'
      const looksLikeHtmlPath = path.endsWith('/') || path.endsWith('.html') || !path.split('/').pop().includes('.')
      if (isHtmlRequest || looksLikeHtmlPath) {
        const indexRequest = new Request(new URL('/', url).toString(), request);
        let indexResponse = await env.ASSETS.fetch(indexRequest);
        if (indexResponse.status !== 404) {
          if (indexResponse.headers.get('Content-Type')?.includes('text/html')) {
            let html = await indexResponse.text();
            const secret = env.MODEL_TOKEN_SECRET
            const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
            let injected = '0'
            let hasSecret = secret ? '1' : '0'
            if (secret) {
              const token = await issueToken(secret, request)
              const inject = `<script>(function(){var t='${token.replace(/'/g, "\\'")}';window.M_T=t;console.log('[worker] token injected len=',t.length);})();<\/script>`
              html = html.replace(/<\/head>/i, `${inject}\n  </head>`)
              html = html.replace(/src="\/model\.glb"/g, `src="/model.glb?t=${token}"`)
              injected = '1'
            } else {
              const injectDbg = `<script>console.warn('[worker] MODEL_TOKEN_SECRET missing; no token injected');<\/script>`
              html = html.replace(/<\/head>/i, `${injectDbg}\n  </head>`)
            }
            headers.set('X-Token-Injected', injected)
            headers.set('X-Token-HasSecret', hasSecret)
            return new Response(html, { status: 200, headers })
          }
          return indexResponse;
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
