export default {
  async fetch(request, env, ctx) {
    // Try to serve static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      // index.html のモデル参照を書き換え（/model/... を外部 URL へ）
      const url = new URL(request.url);
      const isRootHtml = url.pathname === '/' || url.pathname.endsWith('/index.html');
      const accept = request.headers.get('Accept') || '';
      const wantsHtml = accept.includes('text/html');
      if ((isRootHtml || wantsHtml) && assetResponse.headers.get('Content-Type')?.includes('text/html')) {
        const html = await assetResponse.text();
        const modelUrl = env.MODEL_URL || '';
        if (modelUrl) {
          const replaced = html.replace(/src="\/model\/[^"]+\.glb"/g, `src="${modelUrl}"`);
          return new Response(replaced, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      }
      return assetResponse;
    }

    // SPA fallback: serve index.html for navigations
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const accept = request.headers.get('Accept') || '';
      const isHtmlRequest = accept.includes('text/html');
      if (isHtmlRequest) {
        const indexRequest = new Request(new URL('/', url).toString(), request);
        let indexResponse = await env.ASSETS.fetch(indexRequest);
        if (indexResponse.status !== 404) {
          if (indexResponse.headers.get('Content-Type')?.includes('text/html')) {
            const html = await indexResponse.text();
            const modelUrl = env.MODEL_URL || '';
            if (modelUrl) {
              const replaced = html.replace(/src="\/model\/[^"]+\.glb"/g, `src="${modelUrl}"`);
              return new Response(replaced, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            }
          }
          return indexResponse;
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
