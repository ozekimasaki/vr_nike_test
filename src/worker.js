export default {
  async fetch(request, env, ctx) {
    // Try to serve static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // SPA fallback: serve index.html for navigations
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const accept = request.headers.get('Accept') || '';
      const isHtmlRequest = accept.includes('text/html');
      if (isHtmlRequest) {
        const indexRequest = new Request(new URL('/', url).toString(), request);
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        if (indexResponse.status !== 404) {
          return indexResponse;
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
