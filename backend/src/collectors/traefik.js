import config from '../config.js';

async function traefikFetch(path) {
  try {
    const res = await fetch(`${config.traefikApiUrl}/api${path}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getTraefikOverview() {
  return traefikFetch('/overview');
}

export async function getTraefikRouters() {
  return traefikFetch('/http/routers') ?? [];
}

export async function getTraefikServices() {
  return traefikFetch('/http/services') ?? [];
}
