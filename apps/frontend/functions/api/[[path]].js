export async function onRequest(context) {
  const url = new URL(context.request.url);
  const backendWorkerUrl = `https://securelens-backend.securelens.workers.dev${url.pathname}${url.search}`;

  const requestHeaders = new Headers(context.request.headers);
  requestHeaders.set('X-Forwarded-Host', url.host);

  const newRequest = new Request(backendWorkerUrl, {
    method: context.request.method,
    headers: requestHeaders,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' 
      ? context.request.body 
      : undefined,
    redirect: 'follow',
  });

  try {
    const response = await fetch(newRequest);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Backend proxy error', details: err?.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
