async function checkHealth(service) {
  const start = Date.now();

  // If internalUrl is set, hit the internal proxy directly with Host header.
  // This avoids hairpin NAT issues when the dashboard runs on the same machine
  // as the services it monitors.
  const targetUrl = service.internalUrl ?? service.url;
  const headers = service.internalUrl ? { Host: new URL(service.url).hostname } : {};
  // When using internalUrl, don't follow redirects — HTTP→HTTPS redirect from
  // Traefik would send fetch back to the public URL and hit hairpin NAT again.
  // An opaque redirect (status 0) means the proxy received the request → healthy.
  const redirect = service.internalUrl ? 'manual' : 'follow';

  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      redirect,
      headers,
    });
    const statusCode = res.status;
    return {
      name: service.name,
      url: service.url,
      statusCode,
      latency: Date.now() - start,
      healthy: statusCode === 0 || statusCode < 500,
    };
  } catch (err) {
    return {
      name: service.name,
      url: service.url,
      statusCode: 0,
      latency: Date.now() - start,
      healthy: false,
      error: err.message,
    };
  }
}

export async function checkAllHealth(services) {
  return Promise.all(services.map(checkHealth));
}
