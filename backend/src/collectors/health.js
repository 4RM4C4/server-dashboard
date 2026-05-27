async function checkHealth(service) {
  const start = Date.now();

  // If internalUrl is set, hit the internal proxy directly with Host header.
  // This avoids hairpin NAT issues when the dashboard runs on the same machine
  // as the services it monitors.
  const targetUrl = service.internalUrl ?? service.url;
  const headers = service.internalUrl ? { Host: new URL(service.url).hostname } : {};

  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
      headers,
    });
    return {
      name: service.name,
      url: service.url,
      statusCode: res.status,
      latency: Date.now() - start,
      healthy: res.status < 500,
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
