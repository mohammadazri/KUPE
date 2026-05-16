/**
 * Google Directions API wrapper with caching.
 *
 * Wraps google.maps.DirectionsService (part of core Maps JS — no extra
 * library import). Returns a normalised { path, duration, distance } shape
 * per leg. Failed lookups are cached as null for 5 minutes so we don't hammer
 * the API on repeated re-renders.
 *
 * Mode passed in is one of: WALKING | TRANSIT | DRIVING (matches our UI).
 */

const STORAGE_KEY = "kupe:directions:v1";
const FAILURE_TTL_MS = 5 * 60 * 1000;

const memoryCache = new Map();
const inflight = new Map();

function loadDisk() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => memoryCache.set(k, v));
  } catch { /* sessionStorage unavailable */ }
}

function persist() {
  try {
    const obj = {};
    memoryCache.forEach((v, k) => { obj[k] = v; });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* quota / availability */ }
}

let diskLoaded = false;

function ready() {
  return Boolean(window.google?.maps?.DirectionsService);
}

function waitForMaps(timeoutMs = 6000) {
  if (ready()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (ready()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 150);
    };
    tick();
  });
}

function keyFor(origin, dest, mode) {
  const r = (n) => Number(n).toFixed(5);
  return `${r(origin.lat)},${r(origin.lng)}|${r(dest.lat)},${r(dest.lng)}|${mode}`;
}

function fetchRoute(origin, dest, mode) {
  return new Promise((resolve) => {
    const service = new window.google.maps.DirectionsService();
    const request = {
      origin,
      destination: dest,
      travelMode: window.google.maps.TravelMode[mode],
    };
    if (mode === "TRANSIT") {
      request.transitOptions = {
        modes: [
          window.google.maps.TransitMode.BUS,
          window.google.maps.TransitMode.RAIL,
        ],
      };
    }
    service.route(request, (result, status) => {
      if (status !== window.google.maps.DirectionsStatus.OK || !result?.routes?.length) {
        return resolve(null);
      }
      const route = result.routes[0];
      const leg = route.legs?.[0];
      if (!leg) return resolve(null);
      const path = route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      resolve({
        path,
        duration: leg.duration?.text || "",
        distance: leg.distance?.text || "",
        durationValue: leg.duration?.value || 0,
        distanceValue: leg.distance?.value || 0,
      });
    });
  });
}

export async function getRoute(origin, dest, mode) {
  if (!origin || !dest || !mode) return null;
  if (!diskLoaded) { loadDisk(); diskLoaded = true; }

  const key = keyFor(origin, dest, mode);
  const cached = memoryCache.get(key);
  if (cached !== undefined) {
    if (cached === null || cached.route) {
      const ts = cached?.failedAt;
      if (ts && Date.now() - ts > FAILURE_TTL_MS) {
        memoryCache.delete(key);
      } else {
        return cached.route ?? null;
      }
    }
  }
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const ok = await waitForMaps();
    if (!ok) return null;
    const route = await fetchRoute(origin, dest, mode);
    if (route) {
      memoryCache.set(key, { route });
    } else {
      memoryCache.set(key, { route: null, failedAt: Date.now() });
    }
    persist();
    return route;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
