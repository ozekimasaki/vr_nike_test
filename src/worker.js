export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Protected proxy: serve model via Worker only
    if (url.pathname === '/model.glb') {
      try {
        // Read from R2 bucket directly
        const objectKey = env.MODEL_OBJECT_KEY || 'nikechan_v2_outerwear_converted.glb'
        const object = await env.R2_BUCKET.get(objectKey)
        if (!object) return new Response('Not Found', { status: 404 })
        const headers = new Headers()
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Cache-Control', 'public, max-age=3600')
        headers.set('Content-Type', object.httpMetadata?.contentType || 'model/gltf-binary')
        if (object.httpMetadata?.cacheControl) headers.set('Cache-Control', object.httpMetadata.cacheControl)
        return new Response(object.body, { status: 200, headers })
      } catch (e) {
        return new Response('R2 error', { status: 500 })
      }
    }
    // Try to serve static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      // index.html に window.MODEL_URL を注入（R2 URLをクライアントに伝える）
      const isRootHtml = url.pathname === '/' || url.pathname.endsWith('/index.html');
      const accept = request.headers.get('Accept') || '';
      const wantsHtml = accept.includes('text/html');
      if ((isRootHtml || wantsHtml) && assetResponse.headers.get('Content-Type')?.includes('text/html')) {
        const html = await assetResponse.text();
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      return assetResponse;
    }

    // SPA fallback: serve index.html for navigations
    
    if (request.method === 'GET') {
      const accept = request.headers.get('Accept') || '';
      const isHtmlRequest = accept.includes('text/html');
      if (isHtmlRequest) {
        const indexRequest = new Request(new URL('/', url).toString(), request);
        let indexResponse = await env.ASSETS.fetch(indexRequest);
        if (indexResponse.status !== 404) {
          if (indexResponse.headers.get('Content-Type')?.includes('text/html')) {
            const html = await indexResponse.text();
            return new Response(html, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return indexResponse;
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
